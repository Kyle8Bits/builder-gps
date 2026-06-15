"""Load and validate the mock AABW schedule from JSON."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.schemas import Session

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SCHEDULE_PATH = DATA_DIR / "sessions.json"


@lru_cache
def load_sessions() -> list[Session]:
    """Read sessions.json and validate via Pydantic. Cached after first read.

    Returns an empty list if the file is missing or empty (Phase 02 fills it).
    """
    if not SCHEDULE_PATH.exists():
        return []
    raw = SCHEDULE_PATH.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError(
            f"sessions.json must contain a JSON array, got {type(data).__name__}"
        )
    return [Session.model_validate(item) for item in data]


def reload_sessions() -> list[Session]:
    """Bust the cache and reload — useful for dev when editing schedule JSON."""
    load_sessions.cache_clear()
    return load_sessions()
