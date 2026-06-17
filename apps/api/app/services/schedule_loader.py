"""Load and validate the AABW schedule.

Source precedence:
  1. SQLite `sessions_override` table (organizer-imported live workshops)
  2. Bundled `app/data/sessions.json` (mock catalog, fallback)

When an organizer hits POST /admin/sessions to import the real workshops,
the override table fills up and `load_sessions()` switches over on the
next call (after `cache_clear()` runs).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.schemas import Session

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SCHEDULE_PATH = DATA_DIR / "sessions.json"


@lru_cache
def load_sessions() -> list[Session]:
    """Return the effective session catalog. Cached after first read.

    Read order:
      1. `sessions_override` SQLite table — used when ≥1 row exists.
         Organizer-imported live workshops live here.
      2. `app/data/sessions.json` bundled file — mock fallback.

    Returns an empty list if both sources are empty.
    """
    # Import inside the function to avoid a top-level cycle with the storage
    # module (which imports Session schema, which imports config).
    from app.storage.sessions_override_store import count as override_count
    from app.storage.sessions_override_store import get_all as get_override_sessions

    if override_count() > 0:
        return get_override_sessions()

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
    """Bust the cache and reload — useful for dev when editing schedule JSON
    AND for the admin import flow (called after /admin/sessions writes).
    """
    load_sessions.cache_clear()
    return load_sessions()
