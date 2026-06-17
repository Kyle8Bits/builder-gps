"""SQLite store for pre-computed session embeddings.

One row per session_id. Vector stored as JSON TEXT — 44 sessions x 512
floats ~220KB, small enough that BLOB pickle is YAGNI and JSON is
infinitely more debuggable. Lazy table init on first call (mirrors the
init_db() pattern in sqlite_store.py).
"""

from __future__ import annotations

import json
import time
from threading import Lock

from app.storage.sqlite_store import _conn

_TABLE_INIT_LOCK = Lock()
_TABLE_INITIALIZED = False


def init_embeddings_table() -> None:
    """Create the session_embeddings table. Safe to call multiple times."""
    global _TABLE_INITIALIZED
    if _TABLE_INITIALIZED:
        return
    with _TABLE_INIT_LOCK:
        if _TABLE_INITIALIZED:
            return
        with _conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS session_embeddings (
                    session_id  TEXT PRIMARY KEY,
                    vector      TEXT NOT NULL,
                    model       TEXT NOT NULL,
                    embedded_at REAL NOT NULL
                )
                """
            )
        _TABLE_INITIALIZED = True


def upsert_embedding(
    session_id: str,
    vector: list[float],
    model: str,
) -> None:
    """Insert-or-replace one session's embedding."""
    init_embeddings_table()
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO session_embeddings
                (session_id, vector, model, embedded_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                vector=excluded.vector,
                model=excluded.model,
                embedded_at=excluded.embedded_at
            """,
            (session_id, json.dumps(vector), model, time.time()),
        )


def get_all_embeddings() -> list[tuple[str, str, str]]:
    """Return all rows as (session_id, vector_json, model) tuples.

    `vector_json` is the raw TEXT — caller does `json.loads()` only when
    needed to keep the cosine loop in shortlist_sessions cheap.
    """
    init_embeddings_table()
    with _conn() as conn:
        rows = conn.execute(
            "SELECT session_id, vector, model FROM session_embeddings"
        ).fetchall()
    return [(r["session_id"], r["vector"], r["model"]) for r in rows]


def get_embedding_for(session_id: str) -> tuple[str, str] | None:
    """Return (vector_json, model) for one session, or None if not embedded.

    Used by the bootstrap script to skip rows that already match the
    configured model.
    """
    init_embeddings_table()
    with _conn() as conn:
        row = conn.execute(
            "SELECT vector, model FROM session_embeddings WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    if row is None:
        return None
    return (row["vector"], row["model"])
