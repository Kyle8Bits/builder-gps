"""Read-only session catalog endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas import Session
from app.services.schedule_loader import load_sessions

router = APIRouter(tags=["sessions"])


@router.get("/sessions", response_model=list[Session])
async def get_sessions() -> list[Session]:
    """Return the full mock AABW schedule.

    Empty list until Phase 02 populates sessions.json.
    """
    return load_sessions()
