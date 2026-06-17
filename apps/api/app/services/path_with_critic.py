"""Critic-driven retry loop wrapper around compute_path (Phase 04).

Calls compute_path → runs the critic → if "weak", re-runs compute_path
with the critic's suggested constraint, up to `critic_max_retries` times.
Always returns a PathPlan (never raises on critic-only failures).

Every iteration is appended to the builder's `decompose_traces` row so
Phase 06's markdown export can render the reasoning.
"""

from __future__ import annotations

import logging

from app.config import get_settings
from app.schemas import BuilderState, Prerequisites, Session
from app.services.compute_path import PathPlan, compute_path
from app.services.critic import evaluate_path
from app.storage.decompose_traces_store import append_to_trace

log = logging.getLogger("path-with-critic")


def compute_path_with_critic(
    *,
    state: BuilderState,
    prerequisites: Prerequisites,
    sessions: list[Session],
    builder_id: str,
    attended: list[str] | None = None,
    skipped: list[str] | None = None,
    blocked: list[str] | None = None,
) -> PathPlan:
    """Run compute_path with up to `critic_max_retries` critic-driven retries.

    Logic:
    - Iteration N: compute_path with the prior critic's `suggested_constraint`
    - Critic runs once per iteration; if `ok` or None, return current plan
    - If `weak` and retries remain, inject suggested_constraint and loop
    - If retries exhausted with persistent `weak`, accept the final plan
      anyway (better a weak path than a 503 to the user)
    """
    s = get_settings()

    # Fast path: critic disabled — single compute_path call, no re-runs.
    # Used when the configured provider's critic latency would dominate
    # request time (e.g. gpt-oss-120b on Cerebras at ~60s/call).
    if not s.critic_enabled:
        return compute_path(
            state=state,
            prerequisites=prerequisites,
            sessions=sessions,
            attended=attended,
            skipped=skipped,
            blocked=blocked,
        )

    constraint: str | None = None
    plan: PathPlan | None = None

    for attempt in range(s.critic_max_retries + 1):
        plan = compute_path(
            state=state,
            prerequisites=prerequisites,
            sessions=sessions,
            attended=attended,
            skipped=skipped,
            blocked=blocked,
            extra_constraint=constraint,
        )

        verdict = evaluate_path(prerequisites, plan.sessions, plan.readiness_pct)

        # Persist critic trace so Phase 06 export can show the reasoning.
        # Best-effort; swallow trace write failures.
        try:
            append_to_trace(
                builder_id,
                {
                    "phase": "critic",
                    "attempt": attempt + 1,
                    "verdict": verdict.model_dump() if verdict else None,
                    "readiness_pct": plan.readiness_pct,
                    "constraint_in": constraint,
                },
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("trace append failed: %s", exc)

        # Critic blew up → trust the planner.
        if verdict is None:
            return plan

        # Verdict OK → done.
        if verdict.verdict == "ok":
            return plan

        # Verdict weak + retries left → derive constraint and loop.
        if attempt < s.critic_max_retries:
            constraint = verdict.suggested_constraint.strip()
            if not constraint and verdict.missing_capabilities:
                constraint = (
                    "Must include at least one session covering: "
                    + ", ".join(verdict.missing_capabilities[:3])
                )
            log.info(
                "critic weak (attempt %d), retrying with constraint: %s",
                attempt + 1,
                constraint[:100] if constraint else "(empty)",
            )
            continue

        # Retries exhausted but critic still weak → accept it.
        log.info(
            "critic exhausted %d retries, accepting weak path",
            s.critic_max_retries,
        )
        return plan

    # Should be unreachable — loop always returns a plan.
    assert plan is not None
    return plan
