"""Tool-calling decompose agent (Phase 03).

Replaces the single-shot `decompose_goal()` call with a multi-turn agent
loop. The LLM (Llama 3.3 70B via Groq) has two tools at its disposal:

- `search_web(capability_name, query)` — Tavily-backed web search. The
  result is normalized to a `list[ResourceLink]` and cached per capability
  slug so Phase 05's /path/resources endpoint can read it back.
- `evaluate_coverage(goal, proposed_capabilities)` — rule-based grader.
  Forces the agent to either commit (score ≥ 0.8) or iterate.

Loop terminates on `finish_reason == "stop"` (final JSON) or after
`decompose_max_iterations` turns (raises LLMError).

Reasoning trace is persisted to the `decompose_traces` table for Phase 06
markdown export.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.config import get_settings
from app.prompts import load_prompt
from app.schemas import BuilderState, Prerequisites, ResourceLink
from app.services.agent_client import make_agent_client
from app.services.llm_client import LLMError
from app.services.tavily_client import search as tavily_search
from app.storage.capability_resources_store import (
    slugify,
    upsert_capability_resources,
)
from app.storage.decompose_traces_store import upsert_trace

log = logging.getLogger("decompose-agent")

# Tag taxonomy moved from the deleted decompose_goal.py. Keep in sync with
# apps/api/app/data/sessions.json — the path computer scores sessions by
# matching these tags against capability.matching_tags.
KNOWN_TAGS = [
    # providers
    "anthropic", "openai", "google", "vercel", "mongodb", "stripe",
    "cloudflare", "modal", "langchain", "mastra", "langfuse", "byteplus",
    "nvidia", "trae", "apify", "aabw",
    # capabilities
    "agents", "tool-use", "mcp", "rag", "eval", "memory", "multi-agent",
    "voice", "multimodal", "computer-use", "fine-tuning",
    # domains
    "streaming", "observability", "monetization", "payments", "deploy",
    "scraping", "vector-db", "frontend", "browser", "enterprise",
    "dev-tools", "productivity", "startup", "scale",
    # event-flow
    "community", "networking", "demo", "pitch", "judging", "kickoff",
]

# Tool schemas in OpenAI/Groq shape. AnthropicAgentClient would translate
# internally if/when added post-Devpost.
SEARCH_WEB_TOOL = {
    "type": "function",
    "function": {
        "name": "search_web",
        "description": (
            "Search the open web for tutorials, docs, and guides relevant to "
            "a builder capability. Use this to ground each prerequisite in "
            "current 2026 best practice. Call once per topic you're unsure "
            "about."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "capability_name": {
                    "type": "string",
                    "description": (
                        "Short label like 'claude tool use' or 'stripe "
                        "payments integration'. Used as the cache key."
                    ),
                },
                "query": {
                    "type": "string",
                    "description": (
                        "Search query — typically "
                        "'{capability_name} tutorial OR documentation OR guide'"
                    ),
                },
            },
            "required": ["capability_name", "query"],
        },
    },
}

EVALUATE_COVERAGE_TOOL = {
    "type": "function",
    "function": {
        "name": "evaluate_coverage",
        "description": (
            "Self-grade whether your proposed capabilities collectively cover "
            "the builder's goal. Returns a score 0.0–1.0. If score >= 0.8 "
            "you MUST stop calling tools and return the final JSON."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "goal": {"type": "string"},
                "proposed_capabilities": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
            "required": ["goal", "proposed_capabilities"],
        },
    },
}


def _system_message() -> dict[str, Any]:
    return {
        "role": "system",
        "content": load_prompt(
            "decompose-agent", known_tags=", ".join(KNOWN_TAGS)
        ),
    }


def _user_message(state: BuilderState) -> dict[str, Any]:
    return {
        "role": "user",
        "content": (
            "Builder profile (JSON):\n"
            f"{state.model_dump_json(indent=2)}\n\n"
            "Begin by searching the web for the builder's goal. Then propose, "
            "research, and self-evaluate capabilities until coverage >= 0.8. "
            "Return final JSON only when done."
        ),
    }


def _normalize_tavily_to_resources(tavily_result: dict) -> list[ResourceLink]:
    """Map Tavily's raw `results` list → typed ResourceLink list (max 3).

    Source-type detection is purely URL-based so it's fast and predictable.
    Bad rows are dropped rather than failing the agent loop.
    """
    links: list[ResourceLink] = []
    for r in tavily_result.get("results", [])[:3]:
        url = r.get("url", "") or ""
        if "youtube.com" in url or "youtu.be" in url:
            source = "youtube"
        elif "github.com" in url:
            source = "github"
        elif "docs." in url or ".dev/" in url or "readthedocs" in url:
            source = "docs"
        elif any(d in url for d in ["medium.com", "dev.to"]):
            source = "blog"
        else:
            source = "other"
        try:
            links.append(
                ResourceLink(
                    title=(r.get("title") or "")[:200],
                    url=url[:500],
                    source=source,  # type: ignore[arg-type]
                    snippet=(r.get("content") or "")[:300],
                )
            )
        except Exception:  # noqa: BLE001 — skip malformed row
            continue
    return links


def _evaluate_coverage(goal: str, caps: list[str]) -> dict:
    """Rule-based grader. KISS: the LLM's own reasoning + Tavily results do
    the heavy judgment lifting; this tool just enforces structural sanity
    and gives the agent a forcing function to commit or revise.
    """
    score = 1.0
    if not (5 <= len(caps) <= 8):
        score -= 0.3
    if any(len(c) > 80 for c in caps):
        score -= 0.2
    if len({c.lower() for c in caps}) < len(caps):
        score -= 0.2
    return {"score": round(max(0.0, score), 2), "missing_hints": []}


def _strip_json_fence(text: str) -> str:
    """Strip ```json ... ``` fences if the LLM added them.

    Llama sometimes wraps its final JSON in markdown despite the system
    prompt; this is the cheapest way to handle it without an extra retry.
    """
    t = text.strip()
    if t.startswith("```"):
        # Remove leading ```json or ```
        t = t.split("\n", 1)[-1] if "\n" in t else t
        t = t.removeprefix("json").strip()
    if t.endswith("```"):
        t = t.removesuffix("```").strip()
    return t


def decompose_agent(state: BuilderState, *, builder_id: str) -> Prerequisites:
    """Run the multi-turn decompose agent. Returns validated `Prerequisites`.

    Args:
        state: builder's submitted profile.
        builder_id: cookie-bound UUID used to key cached resources + traces.

    Raises:
        LLMError: on exhausted iterations, fatal finish_reason, or JSON parse
            failure on the final turn.
    """
    s = get_settings()
    client = make_agent_client()
    messages: list[dict[str, Any]] = [_system_message(), _user_message(state)]
    tools = [SEARCH_WEB_TOOL, EVALUATE_COVERAGE_TOOL]
    trace: list[dict] = []
    # Per-capability ResourceLink cache populated while the agent searches.
    # Persisted to SQLite once the agent commits to its final capability list.
    capability_cache: dict[str, list[ResourceLink]] = {}

    for iteration in range(s.decompose_max_iterations):
        t0 = time.perf_counter()
        response = client.chat(
            messages=messages, tools=tools, max_tokens=2048
        )
        elapsed = int((time.perf_counter() - t0) * 1000)
        log.info(
            "iter %d finish=%s tool_calls=%d elapsed=%dms",
            iteration + 1,
            response.finish_reason,
            len(response.tool_calls),
            elapsed,
        )

        # --- Final turn: parse JSON, persist cached resources + trace ----- #
        if response.finish_reason == "stop":
            text = _strip_json_fence(response.content or "")
            try:
                prereqs = Prerequisites.model_validate_json(text)
                # Llama tends to invent tags outside the taxonomy (e.g.
                # 'speech-to-text' becomes ['speech','to','text']). Strip
                # anything that's not in KNOWN_TAGS so compute_path's tag
                # matching stays meaningful. Empty list is tolerated.
                # Also stamp deterministic slug so Phase 05's
                # /path/resources lookup matches what we cached above.
                _known = set(KNOWN_TAGS)
                for cap in prereqs.capabilities:
                    cap.matching_tags = [
                        t for t in cap.matching_tags if t in _known
                    ]
                    cap.slug = slugify(cap.name)
            except Exception as exc:
                trace.append(
                    {
                        "iteration": iteration + 1,
                        "finish": "stop",
                        "parse_error": str(exc),
                        "raw": text[:500],
                    }
                )
                upsert_trace(builder_id, trace)
                raise LLMError(
                    f"Final JSON parse failed: {exc} | raw={text[:300]}"
                )

            # Map cached Tavily results to final capabilities.
            #
            # Agents often search with broader / different phrasing than
            # their final capability names. Strategy:
            #   1. Score every (capability, cached_search) pair by shared-
            #      token overlap. Discard pairs with zero overlap.
            #   2. Greedy assign highest-overlap pairs first, with the
            #      constraint that each cached_slug is used at most ONCE.
            #      Prevents the "same 3 resources on capabilities 01 and
            #      05" bug — broad agent searches that overlap multiple
            #      final caps no longer get duplicated.
            #   3. For capabilities still without a match after step 2,
            #      assign the largest UNUSED cached search as a fallback.
            #      Empty cards beat duplicated cards, but a fresh-but-
            #      tangential result beats both.
            _STOPWORDS = {
                "a", "the", "of", "with", "in", "and", "for", "or",
                "to", "on", "an", "by", "as", "is",
            }
            cache_token_index: list[tuple[set[str], str]] = [
                (set(s.split("-")) - _STOPWORDS, s)
                for s, links in capability_cache.items()
                if links
            ]

            # Score every (cap_slug, cache_slug, overlap) pair where
            # overlap >= 1. Sort by overlap descending → biggest matches
            # claim their cache first.
            scored_pairs: list[tuple[int, str, str]] = []
            for cap in prereqs.capabilities:
                cap_tokens = set(cap.slug.split("-")) - _STOPWORDS
                for cache_tokens, cache_slug in cache_token_index:
                    overlap = len(cap_tokens & cache_tokens)
                    if overlap >= 1:
                        scored_pairs.append((overlap, cap.slug, cache_slug))
            scored_pairs.sort(reverse=True)

            assigned_cap_to_cache: dict[str, str] = {}
            used_cache_slugs: set[str] = set()
            for _, cap_slug, cache_slug in scored_pairs:
                if cap_slug in assigned_cap_to_cache:
                    continue
                if cache_slug in used_cache_slugs:
                    continue
                assigned_cap_to_cache[cap_slug] = cache_slug
                used_cache_slugs.add(cache_slug)

            # Step 3 fallback: orphan capabilities get the next-biggest
            # cached search that nobody else claimed. Sorted by result
            # count descending so the most useful unused result goes first.
            unused_caches = sorted(
                (s for s, links in capability_cache.items()
                 if links and s not in used_cache_slugs),
                key=lambda s: -len(capability_cache[s]),
            )
            for cap in prereqs.capabilities:
                if cap.slug in assigned_cap_to_cache:
                    continue
                if not unused_caches:
                    break
                assigned_cap_to_cache[cap.slug] = unused_caches.pop(0)

            for cap_slug, cache_slug in assigned_cap_to_cache.items():
                upsert_capability_resources(
                    cap_slug, builder_id, capability_cache[cache_slug]
                )

            trace.append(
                {
                    "iteration": iteration + 1,
                    "finish": "stop",
                    "final_text": text[:2000],
                    "n_capabilities": len(prereqs.capabilities),
                }
            )
            upsert_trace(builder_id, trace)
            return prereqs

        # --- Tool turn: execute each tool, append results, loop ----------- #
        if response.finish_reason == "tool_calls":
            iter_record: dict[str, Any] = {
                "iteration": iteration + 1,
                "finish": "tool_calls",
                "tool_calls": [],
            }
            # Append assistant message verbatim — it carries the tool_calls.
            messages.append(response.raw_assistant_msg)

            for tc in response.tool_calls:
                payload: dict[str, Any]
                if tc.name == "search_web":
                    query = str(tc.input.get("query", ""))
                    cap_name = str(tc.input.get("capability_name", "goal"))
                    result = tavily_search(query)
                    links = _normalize_tavily_to_resources(result)
                    capability_cache[slugify(cap_name)] = links
                    payload = {
                        "results": [
                            link.model_dump(mode="json") for link in links
                        ],
                    }
                    iter_record["tool_calls"].append(
                        {
                            "name": tc.name,
                            "input": tc.input,
                            "n_results": len(links),
                        }
                    )
                elif tc.name == "evaluate_coverage":
                    grade = _evaluate_coverage(
                        str(tc.input.get("goal", "")),
                        list(tc.input.get("proposed_capabilities", [])),
                    )
                    payload = grade
                    iter_record["tool_calls"].append(
                        {"name": tc.name, "input": tc.input, "grade": grade}
                    )
                else:
                    payload = {"error": f"unknown tool: {tc.name}"}
                    iter_record["tool_calls"].append(
                        {"name": tc.name, "input": tc.input, "error": True}
                    )

                # Per OpenAI/Groq shape: each tool result is its own
                # message with role=tool and the matching tool_call_id.
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(payload),
                    }
                )

            trace.append(iter_record)
            continue

        # --- Fatal finish reasons: log + raise ---------------------------- #
        if response.finish_reason in {"length", "content_filter"}:
            trace.append(
                {
                    "iteration": iteration + 1,
                    "finish": response.finish_reason,
                    "fatal": True,
                }
            )
            upsert_trace(builder_id, trace)
            raise LLMError(
                f"Decompose agent stopped: {response.finish_reason}"
            )

        # Unexpected finish reason — fail loud rather than spin.
        raise LLMError(f"Unexpected finish_reason: {response.finish_reason}")

    # Loop exited without `stop` — exhausted budget.
    upsert_trace(builder_id, trace)
    raise LLMError(
        f"Decompose agent exhausted {s.decompose_max_iterations} iterations "
        "without committing to a final answer."
    )
