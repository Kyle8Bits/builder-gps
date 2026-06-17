"""POST /builder/state — accept form fields, run decomposeGoal +
computePath, save, return initial Path.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Cookie, HTTPException, Response

from pydantic import BaseModel

from app.config import get_settings
from app.schemas import BuilderState, PathResponse
from app.services.decompose_agent import decompose_agent
from app.services.llm_client import LLMError
from app.services.path_with_critic import compute_path_with_critic
from app.services.schedule_loader import load_sessions
from app.storage.sqlite_store import (
    get_builder,
    new_builder_id,
    upsert_builder,
)


class BuilderMe(BaseModel):
    """Identity payload for the cookie-bound session.

    Surfaces the builder_id to the web app so it can build the iCal
    subscription URL ( /path/{id}.ics ) and so the FE knows whether
    to hydrate an existing path on mount.
    """

    builder_id: str
    has_path: bool

router = APIRouter(tags=["builder"])
log = logging.getLogger("builder")

BUILDER_COOKIE = "builder_gps_id"


@router.post("/builder/state", response_model=PathResponse)
async def submit_state(
    state: BuilderState,
    response: Response,
    builder_gps_id: str | None = Cookie(default=None),
) -> PathResponse:
    """Submit/replace builder state. Re-runs decomposeGoal + computePath."""
    builder_id = builder_gps_id or new_builder_id()
    settings = get_settings()
    response.set_cookie(
        BUILDER_COOKIE,
        builder_id,
        httponly=True,
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        max_age=60 * 60 * 24 * 7,
    )

    sessions = load_sessions()
    if not sessions:
        raise HTTPException(
            500, "Session catalog is empty. Phase 02 hasn't loaded."
        )

    try:
        prereqs = decompose_agent(state, builder_id=builder_id)
        log.info(
            "decomposed goal into %d capabilities", len(prereqs.capabilities)
        )

        plan = compute_path_with_critic(
            state=state,
            prerequisites=prereqs,
            sessions=sessions,
            builder_id=builder_id,
        )
        log.info(
            "computed path: %d sessions, readiness=%d",
            len(plan.sessions),
            plan.readiness_pct,
        )
    except LLMError as exc:
        raise HTTPException(503, str(exc))

    upsert_builder(
        builder_id=builder_id,
        state=state,
        prerequisites=prereqs,
        path=plan.sessions,
        readiness_pct=plan.readiness_pct,
        history=[],
    )

    return PathResponse(
        prerequisites=prereqs,
        sessions=plan.sessions,
        readiness_pct=plan.readiness_pct,
        last_change=None,
    )


@router.get("/builder/me", response_model=BuilderMe)
async def get_me(
    builder_gps_id: str | None = Cookie(default=None),
) -> BuilderMe:
    """Return the cookie-bound builder_id, plus whether a path exists."""
    if not builder_gps_id:
        raise HTTPException(404, "No builder session.")
    record = get_builder(builder_gps_id)
    return BuilderMe(
        builder_id=builder_gps_id,
        has_path=record is not None and len(record.path) > 0,
    )
