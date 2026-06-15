"""Path mutation + export routes.

POST /sessions/{id}/mark    — record attended/skipped/blocked, recompute, return
                              updated path + diff.
GET  /path                  — cookie-auth: current builder's PathResponse JSON.
POST /path/regenerate       — cookie-auth: rerun computePath without
                              touching history. Useful for MCP "fresh path".
GET  /path/export.ics       — cookie-auth iCal of the current builder's path.
GET  /path/{builder_id}.ics — public subscription URL for the same.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Cookie, HTTPException, Response

from app.schemas import MarkRequest, PathResponse
from app.services.compute_path import compute_path
from app.services.ical_export import build_ics
from app.services.llm_client import LLMError
from app.services.path_diff import diff_paths
from app.services.schedule_loader import load_sessions
from app.storage.sqlite_store import (
    HistoryEntry,
    get_builder,
    upsert_builder,
)

router = APIRouter(tags=["path"])
log = logging.getLogger("path")


@router.post("/sessions/{session_id}/mark", response_model=PathResponse)
async def mark_session(
    session_id: str,
    body: MarkRequest,
    builder_gps_id: str | None = Cookie(default=None),
) -> PathResponse:
    if not builder_gps_id:
        raise HTTPException(
            400, "No builder session. POST /builder/state first."
        )

    record = get_builder(builder_gps_id)
    if record is None:
        raise HTTPException(
            404, "Builder state not found. Re-submit /builder/state."
        )
    if record.prerequisites is None:
        raise HTTPException(
            409, "Builder has no prerequisites yet — submit /builder/state."
        )

    sessions = load_sessions()
    if not any(s.id == session_id for s in sessions):
        raise HTTPException(404, f"Unknown session id: {session_id}")

    new_history = list(record.history) + [
        HistoryEntry(session_id=session_id, status=body.status, ts=time.time())
    ]

    attended = [h.session_id for h in new_history if h.status == "attended"]
    skipped = [h.session_id for h in new_history if h.status == "skipped"]
    blocked = [h.session_id for h in new_history if h.status == "blocked"]

    try:
        plan = compute_path(
            state=record.state,
            prerequisites=record.prerequisites,
            sessions=sessions,
            attended=attended,
            skipped=skipped,
            blocked=blocked,
        )
    except LLMError as exc:
        raise HTTPException(503, str(exc))

    diffs = diff_paths(record.path, plan.sessions)
    log.info(
        "reroute: %d→%d sessions, %d diffs, readiness %d→%d",
        len(record.path),
        len(plan.sessions),
        len(diffs),
        record.readiness_pct,
        plan.readiness_pct,
    )

    upsert_builder(
        builder_id=record.id,
        state=record.state,
        prerequisites=record.prerequisites,
        path=plan.sessions,
        readiness_pct=plan.readiness_pct,
        history=new_history,
    )

    return PathResponse(
        prerequisites=record.prerequisites,
        sessions=plan.sessions,
        readiness_pct=plan.readiness_pct,
        last_change=diffs,
    )


# ---------------------------------------------------------------------------
# Read + regenerate (cookie-bound; used by MCP via cookie jar)
# ---------------------------------------------------------------------------


@router.get("/path", response_model=PathResponse)
async def get_path(
    builder_gps_id: str | None = Cookie(default=None),
) -> PathResponse:
    """Return the current builder's stored path. No recompute."""
    if not builder_gps_id:
        raise HTTPException(400, "No builder session.")
    record = get_builder(builder_gps_id)
    if record is None or record.prerequisites is None:
        raise HTTPException(404, "No path yet. Submit /builder/state.")
    return PathResponse(
        prerequisites=record.prerequisites,
        sessions=record.path,
        readiness_pct=record.readiness_pct,
        last_change=None,
    )


@router.post("/path/regenerate", response_model=PathResponse)
async def regenerate_path(
    builder_gps_id: str | None = Cookie(default=None),
) -> PathResponse:
    """Recompute path against current state + history. Returns diff vs prior."""
    if not builder_gps_id:
        raise HTTPException(400, "No builder session.")
    record = get_builder(builder_gps_id)
    if record is None or record.prerequisites is None:
        raise HTTPException(404, "No path yet. Submit /builder/state.")

    sessions = load_sessions()
    attended = [h.session_id for h in record.history if h.status == "attended"]
    skipped = [h.session_id for h in record.history if h.status == "skipped"]
    blocked = [h.session_id for h in record.history if h.status == "blocked"]

    try:
        plan = compute_path(
            state=record.state,
            prerequisites=record.prerequisites,
            sessions=sessions,
            attended=attended,
            skipped=skipped,
            blocked=blocked,
        )
    except LLMError as exc:
        raise HTTPException(503, str(exc))

    diffs = diff_paths(record.path, plan.sessions)
    upsert_builder(
        builder_id=record.id,
        state=record.state,
        prerequisites=record.prerequisites,
        path=plan.sessions,
        readiness_pct=plan.readiness_pct,
        history=record.history,
    )
    log.info("regenerate: %d sessions, %d diffs", len(plan.sessions), len(diffs))
    return PathResponse(
        prerequisites=record.prerequisites,
        sessions=plan.sessions,
        readiness_pct=plan.readiness_pct,
        last_change=diffs,
    )


# ---------------------------------------------------------------------------
# iCal export
# ---------------------------------------------------------------------------


def _ics_response(builder_id: str, *, as_attachment: bool) -> Response:
    """Render the builder's path as an iCal text response."""
    record = get_builder(builder_id)
    if record is None:
        raise HTTPException(404, "No path found for that builder id.")
    sessions = load_sessions()
    ics = build_ics(
        path_sessions=record.path,
        catalog=sessions,
        readiness_pct=record.readiness_pct,
    )
    headers = {"Cache-Control": "public, max-age=600"}
    if as_attachment:
        headers["Content-Disposition"] = (
            'attachment; filename="builder-gps.ics"'
        )
    return Response(
        content=ics,
        media_type="text/calendar; charset=utf-8",
        headers=headers,
    )


@router.get("/path/export.ics", include_in_schema=False)
async def export_ics_for_session(
    builder_gps_id: str | None = Cookie(default=None),
) -> Response:
    """Cookie-bound iCal download for the current browser session."""
    if not builder_gps_id:
        raise HTTPException(
            400, "No builder session. Submit /builder/state first."
        )
    return _ics_response(builder_gps_id, as_attachment=True)


@router.get("/path/{builder_id}.ics", include_in_schema=False)
async def export_ics_public(builder_id: str) -> Response:
    """Public, stable subscription URL — UUID is the bearer token."""
    return _ics_response(builder_id, as_attachment=False)
