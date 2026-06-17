"""Self-eval critic (Phase 04).

After compute_path() returns a candidate path, the critic does a single
Llama call asking "does this path honestly cover the prereqs?" If the
verdict is "weak", path_with_critic re-runs compute_path with the critic's
suggested constraint appended.

The critic is allowed to fail — if Groq is flaky or the JSON is unparseable,
we return None and the caller treats it as "ok" (don't fail the user
request on a critic blip).
"""

from __future__ import annotations

import json
import logging
import time

from app.config import get_settings
from app.prompts import load_prompt
from app.schemas import CriticVerdict, PathSession, Prerequisites
from app.services.llm_client import LLMError, structured

log = logging.getLogger("critic")


def _user_prompt(
    prereqs: Prerequisites,
    path: list[PathSession],
    readiness_pct: int,
) -> str:
    return (
        f"Readiness: {readiness_pct}%\n\n"
        "Prerequisites:\n"
        f"{prereqs.model_dump_json(indent=2)}\n\n"
        "Proposed path (session IDs + reasons):\n"
        f"{json.dumps([p.model_dump() for p in path], indent=2)}\n\n"
        "Return JSON only matching the CriticVerdict schema."
    )


def evaluate_path(
    prereqs: Prerequisites,
    path: list[PathSession],
    readiness_pct: int,
) -> CriticVerdict | None:
    """Return the critic's verdict, or None on critic failure.

    None is caller's signal to treat as 'ok' — we don't want a flaky
    critic to take down the user request.
    """
    s = get_settings()
    threshold_pct = int(s.critic_readiness_threshold * 100)
    sys = load_prompt("critic", threshold_pct=str(threshold_pct))

    try:
        t0 = time.perf_counter()
        verdict = structured(
            model=s.model_critic,
            system=sys,
            user=_user_prompt(prereqs, path, readiness_pct),
            response_schema=CriticVerdict,
            temperature=0.2,
        )
        elapsed = int((time.perf_counter() - t0) * 1000)
        log.info(
            "critic verdict=%s missing=%d elapsed=%dms",
            verdict.verdict,
            len(verdict.missing_capabilities),
            elapsed,
        )
        return verdict
    except LLMError as exc:
        log.warning("critic failed (LLMError): %s", exc)
        return None
    except Exception as exc:  # noqa: BLE001 — never let critic crash request
        log.warning("critic unexpected error: %s", exc)
        return None
