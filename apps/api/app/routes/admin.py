"""Organizer admin endpoints.

Lets AABW organizers replace the bundled mock catalog with the live
workshop schedule WITHOUT redeploying. Auth via shared bearer token in
the `X-Admin-Token` header — same token configured as `ADMIN_TOKEN` in
the API's environment.

Endpoints:
- GET  /admin/sessions      → current effective catalog + source header
- POST /admin/sessions      → replace catalog with the request body
- POST /admin/sessions/clear → wipe override (fall back to mock JSON)
"""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Header, HTTPException, Response

from app.config import get_settings
from app.schemas import Session
from app.services.schedule_loader import load_sessions, reload_sessions
from app.storage.sessions_override_store import (
    count as override_count,
)
from app.storage.sessions_override_store import (
    replace_all as replace_override_sessions,
)

router = APIRouter(prefix="/admin", tags=["admin"])
log = logging.getLogger("admin")


def _require_admin(x_admin_token: str | None) -> None:
    """Constant-time token check. Returns 503 if admin disabled, 401 on mismatch."""
    settings = get_settings()
    if not settings.admin_token:
        raise HTTPException(
            503,
            "Admin disabled. Set ADMIN_TOKEN in the API environment "
            "to enable organizer imports.",
        )
    if not x_admin_token or not secrets.compare_digest(
        x_admin_token, settings.admin_token
    ):
        raise HTTPException(401, "Invalid admin token.")


@router.get("/sessions", response_model=list[Session])
async def get_effective_sessions(
    response: Response,
    x_admin_token: str | None = Header(default=None),
) -> list[Session]:
    """Return the current effective catalog.

    Sets `X-Source: override` if the override table is in use, otherwise
    `X-Source: file`. The frontend uses this to label what the organizer
    is looking at before they decide to replace it.
    """
    _require_admin(x_admin_token)
    sessions = load_sessions()
    response.headers["X-Source"] = "override" if override_count() > 0 else "file"
    response.headers["X-Count"] = str(len(sessions))
    return sessions


@router.post("/sessions")
async def replace_sessions(
    body: list[Session],
    x_admin_token: str | None = Header(default=None),
) -> dict:
    """Replace the entire override catalog with `body`.

    Atomic: deletes all old rows, inserts all new rows, then busts the
    in-process `load_sessions` lru_cache so subsequent /sessions and
    /builder/state calls see the new catalog immediately.

    NOTE: embeddings are NOT auto-recomputed — Voyage embeddings of the
    mock catalog become stale after import. Organizers should re-run
    `python scripts/bootstrap-embeddings.py` on the server if shortlist
    matters for them. For Devpost we degrade gracefully (the shortlist
    falls back to "return all sessions" when slugs don't match).
    """
    _require_admin(x_admin_token)
    if not body:
        raise HTTPException(
            400, "Empty catalog rejected. POST /admin/sessions/clear to wipe."
        )
    n = replace_override_sessions(body)
    reload_sessions()
    log.info("admin import: replaced catalog with %d sessions", n)
    return {"imported": n, "source": "override"}


@router.post("/sessions/clear")
async def clear_override(
    x_admin_token: str | None = Header(default=None),
) -> dict:
    """Wipe the override table — schedule_loader falls back to sessions.json."""
    _require_admin(x_admin_token)
    n = replace_override_sessions([])
    reload_sessions()
    log.info("admin clear: override wiped (was %d rows)", n)
    return {"cleared": True, "source": "file"}
