"""Agent client abstraction for tool-calling LLMs.

v1 ships only `GroqAgentClient` (Llama 3.3 70B via Groq's OpenAI-compatible
tool API). Post-Devpost: add `AnthropicAgentClient` and flip
`settings.agent_client_provider` — the decompose agent doesn't change.

The chat() return shape is provider-agnostic so the calling loop is the
same regardless of which LLM is wired in. Tool definitions are passed in
OpenAI shape ({"type": "function", "function": {...}}) because that's the
Groq native format; any future Anthropic client would translate internally.

Known issue: Groq's Llama 3.3 70B tool adapter sometimes emits malformed
function-call syntax (extra whitespace between function name and JSON args)
which the adapter rejects with `tool_use_failed`. We retry once with
temperature=0 on these specific failures since deterministic output usually
fixes the formatting.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from typing import Any, Protocol

from cerebras.cloud.sdk import BadRequestError as CerebrasBadRequestError
from cerebras.cloud.sdk import Cerebras
from groq import BadRequestError as GroqBadRequestError
from groq import Groq

from app.config import get_settings

log = logging.getLogger("agent-client")


@dataclass
class AgentToolCall:
    """One tool the LLM wants us to execute this turn."""

    id: str
    name: str
    input: dict[str, Any]


@dataclass
class AgentResponse:
    """Provider-agnostic response from one agent turn."""

    finish_reason: str  # "stop" | "tool_calls" | "length" | "content_filter"
    content: str | None  # final text on "stop"
    tool_calls: list[AgentToolCall]  # populated on "tool_calls"
    raw_assistant_msg: dict[str, Any]  # appended verbatim back into messages


class AgentClient(Protocol):
    """The interface every concrete client implements."""

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int = 2048,
    ) -> AgentResponse: ...


# --------------------------------------------------------------------------- #
# v1 implementation — Groq + Llama 3.3 70B                                    #
# --------------------------------------------------------------------------- #


class GroqAgentClient:
    """Tool-calling agent backed by Groq's OpenAI-compatible API."""

    def __init__(self, api_key: str, model: str) -> None:
        self._client = Groq(api_key=api_key)
        self._model = model

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int = 2048,
    ) -> AgentResponse:
        # Temperature 0 — tool calling needs deterministic syntax; Groq's
        # adapter rejects calls with the wrong spacing/quoting.
        # On tool_use_failed: one short retry. Llama's tool syntax is
        # occasionally flaky on Groq and a second try usually succeeds.
        last_exc: Exception | None = None
        for attempt in range(2):
            try:
                resp = self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    max_tokens=max_tokens,
                    temperature=0.0,
                )
                break
            except GroqBadRequestError as exc:
                code = getattr(exc, "code", None) or (
                    getattr(getattr(exc, "body", None), "get", lambda *_: None)(
                        "error", {}
                    ).get("code")
                    if hasattr(exc, "body")
                    else None
                )
                # The "tool_use_failed" string is also present in the message
                # body when the typed code attribute isn't set.
                if (
                    code == "tool_use_failed"
                    or "tool_use_failed" in str(exc)
                ):
                    last_exc = exc
                    log.warning(
                        "groq tool_use_failed on attempt %d — retrying",
                        attempt + 1,
                    )
                    time.sleep(0.5)
                    continue
                raise
        else:
            # Both attempts hit tool_use_failed.
            raise last_exc if last_exc else RuntimeError("groq retry exhausted")

        choice = resp.choices[0]
        msg = choice.message

        # Parse tool_calls if present. Groq occasionally returns malformed
        # JSON in function.arguments — treat as no-op so the loop can recover.
        tool_calls: list[AgentToolCall] = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                try:
                    parsed_args = json.loads(tc.function.arguments)
                except (json.JSONDecodeError, TypeError) as exc:
                    log.warning(
                        "malformed tool arguments from groq: %s — raw=%r",
                        exc,
                        tc.function.arguments[:200],
                    )
                    parsed_args = {}
                tool_calls.append(
                    AgentToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        input=parsed_args,
                    )
                )

        # Build the echo-back message manually. `msg.model_dump()` includes
        # nullable fields like `function_call: None` that Groq's API rejects
        # when posted back ("for 'role:assistant' function_call must not be
        # nullable"). Only include fields Groq actually expects.
        assistant_msg: dict[str, Any] = {"role": "assistant"}
        if msg.content is not None:
            assistant_msg["content"] = msg.content
        if msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ]

        return AgentResponse(
            finish_reason=choice.finish_reason or "stop",
            content=msg.content,
            tool_calls=tool_calls,
            raw_assistant_msg=assistant_msg,
        )


# --------------------------------------------------------------------------- #
# Alternate Llama provider — Cerebras Cloud SDK (1M tokens/day free tier)     #
# Same Llama 3.3 70B model, same OpenAI-compatible API shape as Groq.         #
# --------------------------------------------------------------------------- #


class CerebrasAgentClient:
    """Tool-calling agent backed by Cerebras' inference cloud."""

    def __init__(self, api_key: str, model: str) -> None:
        self._client = Cerebras(api_key=api_key)
        self._model = model

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        max_tokens: int = 2048,
    ) -> AgentResponse:
        # Same temp=0 + retry-on-tool_use_failed strategy as Groq. Llama on
        # any provider has the same tool-syntax flakiness.
        last_exc: Exception | None = None
        for attempt in range(2):
            try:
                resp = self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    max_tokens=max_tokens,
                    temperature=0.0,
                )
                break
            except CerebrasBadRequestError as exc:
                if "tool_use_failed" in str(exc):
                    last_exc = exc
                    log.warning(
                        "cerebras tool_use_failed on attempt %d — retrying",
                        attempt + 1,
                    )
                    time.sleep(0.5)
                    continue
                raise
        else:
            raise last_exc if last_exc else RuntimeError(
                "cerebras retry exhausted"
            )

        choice = resp.choices[0]
        msg = choice.message

        # Build echo-back assistant message manually — same reason as Groq:
        # SDK's full model_dump() may include nullable fields the API
        # round-trip rejects.
        assistant_msg: dict[str, Any] = {"role": "assistant"}
        if msg.content is not None:
            assistant_msg["content"] = msg.content
        if msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in msg.tool_calls
            ]

        tool_calls: list[AgentToolCall] = []
        if msg.tool_calls:
            for tc in msg.tool_calls:
                try:
                    parsed_args = json.loads(tc.function.arguments)
                except (json.JSONDecodeError, TypeError) as exc:
                    log.warning(
                        "malformed tool arguments from cerebras: %s — raw=%r",
                        exc,
                        tc.function.arguments[:200],
                    )
                    parsed_args = {}
                tool_calls.append(
                    AgentToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        input=parsed_args,
                    )
                )

        return AgentResponse(
            finish_reason=choice.finish_reason or "stop",
            content=msg.content,
            tool_calls=tool_calls,
            raw_assistant_msg=assistant_msg,
        )


def make_agent_client() -> AgentClient:
    """Pick the concrete client based on settings.agent_client_provider."""
    s = get_settings()
    provider = s.agent_client_provider.lower()
    if provider == "groq":
        if not s.groq_api_key:
            raise RuntimeError(
                "GROQ_API_KEY missing — set in apps/api/.env"
            )
        return GroqAgentClient(
            api_key=s.groq_api_key,
            model=s.model_decompose_agent,
        )
    if provider == "cerebras":
        if not s.cerebras_api_key:
            raise RuntimeError(
                "CEREBRAS_API_KEY missing — set in apps/api/.env"
            )
        return CerebrasAgentClient(
            api_key=s.cerebras_api_key,
            model=s.cerebras_model,
        )
    if provider == "anthropic":
        # Post-Devpost: AnthropicAgentClient(api_key=s.anthropic_api_key, model=s.claude_decompose_model)
        raise NotImplementedError(
            "AnthropicAgentClient not in v1. Flip "
            "AGENT_CLIENT_PROVIDER=cerebras (free) or =groq (paid)."
        )
    raise ValueError(f"Unknown agent_client_provider: {provider}")
