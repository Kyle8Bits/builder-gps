"""SQLite store for organizer-imported workshop sessions.

When this table has ≥1 row, `schedule_loader.load_sessions()` reads from
here instead of the bundled `app/data/sessions.json`. That's how
organizers swap the mock catalog for the live AABW workshop schedule
without redeploying — they POST a JSON array of Session objects to
/admin/sessions, we replace_all + bust the lru_cache.

Lazy table init mirrors `embeddings_store.py` and `sqlite_store.init_db()`.
"""

from __future__ import annotations

import json
import time
from threading import Lock

from app.schemas import Session
from app.storage.sqlite_store import _conn

_TABLE_INIT_LOCK = Lock()
_TABLE_INITIALIZED = False


def init_sessions_override_table() -> None:
    """Create the sessions_override table. Safe to call multiple times."""
    global _TABLE_INITIALIZED
    if _TABLE_INITIALIZED:
        return
    with _TABLE_INIT_LOCK:
        if _TABLE_INITIALIZED:
            return
        with _conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions_override (
                    id           TEXT PRIMARY KEY,
                    session_json TEXT NOT NULL,
                    imported_at  REAL NOT NULL
                )
                """
            )
        _TABLE_INITIALIZED = True


def count() -> int:
    """Number of override rows. Zero → schedule_loader falls back to JSON file."""
    init_sessions_override_table()
    with _conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM sessions_override"
        ).fetchone()
    return int(row["n"]) if row else 0


def get_all() -> list[Session]:
    """Return all imported sessions, deserialized.

    Bad rows are skipped (not raised) so a single malformed row from a
    legacy import can't take the whole catalog offline.
    """
    init_sessions_override_table()
    with _conn() as conn:
        rows = conn.execute(
            "SELECT session_json FROM sessions_override"
        ).fetchall()
    out: list[Session] = []
    for r in rows:
        try:
            out.append(Session.model_validate_json(r["session_json"]))
        except Exception:
            continue
    return out


def replace_all(sessions: list[Session]) -> int:
    """Replace the entire override catalog. Atomic via a single transaction.

    Returns the number of rows inserted. Caller is responsible for busting
    `schedule_loader.load_sessions.cache_clear()` after this — done in
    routes/admin.py so the cache-bust lives at the request boundary.
    """
    init_sessions_override_table()
    now = time.time()
    with _conn() as conn:
        conn.execute("DELETE FROM sessions_override")
        for s in sessions:
            conn.execute(
                """
                INSERT INTO sessions_override
                    (id, session_json, imported_at)
                VALUES (?, ?, ?)
                """,
                (s.id, s.model_dump_json(), now),
            )
    return len(sessions)
