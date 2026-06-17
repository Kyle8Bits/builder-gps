"""Tavily web-search client wrapper.

Called from inside the decompose agent's tool-use loop. Returns Tavily's
raw search response dict (with "results" key) or an error envelope on
failure so the loop can recover without raising.

Domain biasing is light — we just expose Tavily's params. Hard URL
filtering happens in the agent loop where we know the capability context.
"""

from __future__ import annotations

from tavily import TavilyClient

from app.config import get_settings

# Bias toward sources that are most useful for builder context: tutorials,
# docs, github repos. Tavily's `include_domains` accepts a list of partial
# matches; we leave this OFF by default because over-filtering loses real
# results, but the constant is here for easy A/B comparison if needed.
PREFERRED_DOMAINS = [
    "youtube.com",
    "github.com",
    "dev.to",
    "medium.com",
]


def search(query: str, max_results: int = 5) -> dict:
    """Run a Tavily search. Never raises — returns {"error": str, "results": []}
    on any failure so the agent loop can decide what to do.

    Args:
        query: search string. Truncated to 500 chars (Tavily rejects longer).
        max_results: cap on Tavily results returned.

    Returns:
        Dict with "results" list (possibly empty) and optional "error" key.
    """
    settings = get_settings()
    if not settings.tavily_api_key:
        return {"error": "TAVILY_API_KEY missing", "results": []}

    client = TavilyClient(api_key=settings.tavily_api_key)
    try:
        return client.search(
            query=query[:500],
            search_depth="basic",
            max_results=max_results,
        )
    except Exception as exc:  # noqa: BLE001 — must never raise to the agent loop
        return {"error": f"{type(exc).__name__}: {exc}", "results": []}
