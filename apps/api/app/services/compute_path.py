"""LLM call 2: pick the 6–10 sessions that get the builder to their goal.

Inputs:
- prerequisites (from decompose_goal)
- builder state (form fields)
- full session catalog
- history (sessions the builder has attended/skipped/blocked)

Output: an ordered list of PathSessions, each with a 1-sentence "why this is
for you" reason, plus an overall readiness_pct (0–100).
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.config import get_settings
from app.prompts import load_prompt
from app.schemas import (
    BuilderState,
    PathSession,
    Prerequisites,
    Session,
)
from app.services.llm_client import structured


class PathPlan(BaseModel):
    """LLM output for compute_path. Composed into PathResponse upstream."""

    sessions: list[PathSession]
    readiness_pct: int = Field(ge=0, le=100)


def _user_prompt(
    *,
    state: BuilderState,
    prerequisites: Prerequisites,
    sessions: list[Session],
    attended: list[str],
    skipped: list[str],
    blocked: list[str],
    extra_constraint: str | None = None,
) -> str:
    base = (
        "Builder state:\n"
        f"{state.model_dump_json(indent=2)}\n\n"
        "Prerequisites (ordered foundational → advanced):\n"
        f"{prerequisites.model_dump_json(indent=2)}\n\n"
        "Session catalog (full AABW schedule):\n"
        f"{_sessions_compact(sessions)}\n\n"
        "History:\n"
        f"- attended: {attended or 'none'}\n"
        f"- skipped: {skipped or 'none'}\n"
        f"- blocked: {blocked or 'none'}\n\n"
        "Pick 6–10 sessions. Return JSON only."
    )
    # Phase 04 — critic-driven re-run injects a constraint hint after the
    # base prompt. The model must satisfy this on top of the existing rules.
    if extra_constraint:
        base += (
            "\n\nADDITIONAL CONSTRAINT FROM CRITIC:\n"
            f"{extra_constraint}\n"
            "Adjust the session selection to satisfy this constraint."
        )
    return base


def _sessions_compact(sessions: list[Session]) -> str:
    """Compact representation to keep token use sane while preserving all
    signal the LLM needs to rank sessions."""
    rows = [
        {
            "id": s.id,
            "day": s.day,
            "start": s.start,
            "end": s.end,
            "partner": s.partner,
            "title": s.title,
            "tags": s.tags,
            "level": s.level,
            "source": s.source,
        }
        for s in sessions
    ]
    import json

    return json.dumps(rows, ensure_ascii=False)


def compute_path(
    *,
    state: BuilderState,
    prerequisites: Prerequisites,
    sessions: list[Session],
    attended: list[str] | None = None,
    skipped: list[str] | None = None,
    blocked: list[str] | None = None,
    extra_constraint: str | None = None,
) -> PathPlan:
    """Run the path-computation LLM call.

    `extra_constraint` is the critic's hint when the prior path was judged
    "weak" (Phase 04). Empty/None for the first attempt.
    """
    settings = get_settings()
    return structured(
        model=settings.model_compute_path,
        system=load_prompt("compute-path"),
        user=_user_prompt(
            state=state,
            prerequisites=prerequisites,
            sessions=sessions,
            attended=attended or [],
            skipped=skipped or [],
            blocked=blocked or [],
            extra_constraint=extra_constraint,
        ),
        response_schema=PathPlan,
        temperature=0.4,
    )
