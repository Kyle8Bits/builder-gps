"""SQLite store for the decompose agent's per-iteration reasoning trace.

One row per builder. Trace is a JSON list of iteration records (tool calls
made, grades returned, final text). Phase 04 appends critic verdicts to
the same list. Phase 06 reads it to render the "reasoning" section of the
markdown agent-context export.
"""

from __future__ import annotations

import json
import time
from threading import Lock

from app.storage.sqlite_store import _conn

_TABLE_INIT_LOCK = Lock()
_TABLE_INITIALIZED = False


def init_decompose_traces_table() -> None:
    """Create the table. Safe to call multiple times."""
    global _TABLE_INITIALIZED
    if _TABLE_INITIALIZED:
        return
    with _TABLE_INIT_LOCK:
        if _TABLE_INITIALIZED:
            return
        with _conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS decompose_traces (
                    builder_id TEXT PRIMARY KEY,
                    trace_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """
            )
        _TABLE_INITIALIZED = True


def upsert_trace(builder_id: str, trace: list[dict]) -> None:
    """Insert-or-replace the entire trace for one builder."""
    init_decompose_traces_table()
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO decompose_traces (builder_id, trace_json, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(builder_id) DO UPDATE SET
                trace_json=excluded.trace_json,
                created_at=excluded.created_at
            """,
            (builder_id, json.dumps(trace), time.time()),
        )


def get_trace(builder_id: str) -> list[dict] | None:
    """Return the trace list for a builder, or None if absent."""
    init_decompose_traces_table()
    with _conn() as conn:
        row = conn.execute(
            "SELECT trace_json FROM decompose_traces WHERE builder_id = ?",
            (builder_id,),
        ).fetchone()
    if row is None:
        return None
    try:
        return json.loads(row["trace_json"])
    except Exception:
        return None


def append_to_trace(builder_id: str, record: dict) -> None:
    """Append a single record to the trace. Used by Phase 04 (critic)."""
    existing = get_trace(builder_id) or []
    existing.append(record)
    upsert_trace(builder_id, existing)
