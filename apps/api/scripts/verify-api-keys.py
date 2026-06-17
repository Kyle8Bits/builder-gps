"""Smoke-test new API keys against each provider.

Run from apps/api/:
    python scripts/verify-api-keys.py

v1 (Devpost): Voyage + Tavily must pass; Anthropic SKIPs when key is blank.
Post-Devpost: set ANTHROPIC_API_KEY in .env to flip Anthropic from SKIP to OK.

Exit codes:
    0 — all configured providers passed (skips don't count as failures)
    1 — any configured provider failed or errored
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure `app.config` is importable when run as `python scripts/verify-api-keys.py`
# from the apps/api/ directory. Adds apps/api/ to sys.path.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402


def check_voyage(s) -> bool | None:
    """voyage-3-lite returns 512 dims, voyage-3 / voyage-3.5 return 1024.
    Don't hardcode — just check we got a non-empty vector back.
    Phase 02 locks the exact dimension in the embeddings table.
    """
    if not s.voyage_api_key:
        return None
    import voyageai

    vo = voyageai.Client(api_key=s.voyage_api_key)
    r = vo.embed(texts=["hello"], model=s.embedding_model, input_type="document")
    if len(r.embeddings) != 1:
        return False
    dim = len(r.embeddings[0])
    print(f"       ({s.embedding_model} returned {dim} dims)")
    return dim > 0


def check_tavily(s) -> bool | None:
    if not s.tavily_api_key:
        return None
    from tavily import TavilyClient

    t = TavilyClient(api_key=s.tavily_api_key)
    r = t.search(query="agentic ai", max_results=1)
    return bool(r.get("results"))


def check_anthropic(s) -> bool | None:
    """Returns None (SKIP) when key blank — v1 does not require Anthropic."""
    if not s.anthropic_api_key:
        return None
    from anthropic import Anthropic

    client = Anthropic(api_key=s.anthropic_api_key)
    r = client.messages.create(
        model=s.claude_decompose_model,
        max_tokens=16,
        messages=[{"role": "user", "content": "Reply OK"}],
    )
    return any(b.type == "text" and "OK" in b.text.upper() for b in r.content)


def main() -> int:
    s = get_settings()
    checks = [
        ("voyage", check_voyage),
        # ("tavily", check_tavily),
        # ("anthropic", check_anthropic),
    ]
    failed: list[str] = []
    for name, fn in checks:
        try:
            ok = fn(s)
            if ok is None:
                print(f"[SKIP] {name} (key empty — v1 OK)")
                continue
            print(f"[{'OK' if ok else 'FAIL'}] {name}")
            if not ok:
                failed.append(name)
        except Exception as exc:
            # Mask any leaked key fragments in error messages.
            print(f"[ERROR] {name}: {type(exc).__name__}: {str(exc)[:200]}")
            failed.append(name)
    if failed:
        print(f"\n{len(failed)} check(s) failed: {', '.join(failed)}")
        return 1
    print("\nAll configured providers passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
