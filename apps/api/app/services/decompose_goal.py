"""LLM call 1: turn a builder's goal + context into ordered prerequisites.

Output is a structured `Prerequisites` object with 5–8 capabilities ordered
from foundational to advanced. Each capability carries `matching_tags` that
the path-computer uses to score sessions.
"""

from __future__ import annotations

from app.config import get_settings
from app.prompts import load_prompt
from app.schemas import BuilderState, Prerequisites
from app.services.llm_client import structured

# Tag taxonomy. Keep in sync with apps/api/app/data/sessions.json.
# The LLM uses these tags to declare which sessions each capability matches.
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


def _system_prompt() -> str:
    return load_prompt("decompose-goal", known_tags=", ".join(KNOWN_TAGS))


def _user_prompt(state: BuilderState) -> str:
    return (
        "Builder profile (JSON):\n"
        f"{state.model_dump_json(indent=2)}\n\n"
        "Decompose this goal into ordered prerequisites. Return JSON only."
    )


def decompose_goal(state: BuilderState) -> Prerequisites:
    """Run the goal-decomposition LLM call."""
    settings = get_settings()
    return structured(
        model=settings.model_decompose,
        system=_system_prompt(),
        user=_user_prompt(state),
        response_schema=Prerequisites,
        temperature=0.3,
    )
