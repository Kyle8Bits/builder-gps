"""SQLite-backed builder state store.

One row per builder. Everything else (prereqs, path, history) is stored as
JSON columns — simple, schema-less, fast enough for a hackathon demo.
"""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

from app.config import get_settings
from app.schemas import (
    BuilderState,
    PathSession,
    Prerequisites,
)


@dataclass
class HistoryEntry:
    session_id: str
    status: str  # MarkStatus
    ts: float


@dataclass
class BuilderRecord:
    id: str
    state: BuilderState
    prerequisites: Prerequisites | None
    path: list[PathSession]
    readiness_pct: int
    history: list[HistoryEntry]

    def attended_ids(self) -> list[str]:
        return [h.session_id for h in self.history if h.status == "attended"]

    def skipped_ids(self) -> list[str]:
        return [h.session_id for h in self.history if h.status == "skipped"]

    def blocked_ids(self) -> list[str]:
        return [h.session_id for h in self.history if h.status == "blocked"]


_DB_INIT_LOCK = Lock()
_DB_INITIALIZED = False


def _db_path() -> Path:
    settings = get_settings()
    # Resolve relative to apps/api/ so the db lives next to the venv.
    base = Path(__file__).resolve().parents[2]
    return base / settings.sqlite_path


def _conn() -> sqlite3.Connection:
    path = _db_path()
    # Ensure the parent dir exists. Without this, an absolute SQLITE_PATH
    # like /data/builder_gps.db crashes startup when the Railway volume
    # hasn't been mounted yet (or on first deploy before the mount lands).
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create the schema. Safe to call multiple times."""
    global _DB_INITIALIZED
    if _DB_INITIALIZED:
        return
    with _DB_INIT_LOCK:
        if _DB_INITIALIZED:
            return
        with _conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS builders (
                    id TEXT PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    prereqs_json TEXT,
                    path_json TEXT NOT NULL DEFAULT '[]',
                    readiness_pct INTEGER NOT NULL DEFAULT 0,
                    history_json TEXT NOT NULL DEFAULT '[]',
                    updated_at REAL NOT NULL
                )
                """
            )
        _DB_INITIALIZED = True


def new_builder_id() -> str:
    return uuid.uuid4().hex


def upsert_builder(
    *,
    builder_id: str,
    state: BuilderState,
    prerequisites: Prerequisites | None,
    path: list[PathSession],
    readiness_pct: int,
    history: list[HistoryEntry] | None = None,
) -> BuilderRecord:
    """Insert-or-replace the full builder row."""
    init_db()
    history = history or []
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO builders
                (id, state_json, prereqs_json, path_json, readiness_pct,
                 history_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                state_json=excluded.state_json,
                prereqs_json=excluded.prereqs_json,
                path_json=excluded.path_json,
                readiness_pct=excluded.readiness_pct,
                history_json=excluded.history_json,
                updated_at=excluded.updated_at
            """,
            (
                builder_id,
                state.model_dump_json(),
                prerequisites.model_dump_json() if prerequisites else None,
                json.dumps([p.model_dump() for p in path]),
                readiness_pct,
                json.dumps([h.__dict__ for h in history]),
                time.time(),
            ),
        )
    return BuilderRecord(
        id=builder_id,
        state=state,
        prerequisites=prerequisites,
        path=path,
        readiness_pct=readiness_pct,
        history=history,
    )


def get_builder(builder_id: str) -> BuilderRecord | None:
    init_db()
    with _conn() as conn:
        row = conn.execute(
            "SELECT * FROM builders WHERE id = ?", (builder_id,)
        ).fetchone()
    if row is None:
        return None
    state = BuilderState.model_validate_json(row["state_json"])
    prereqs = (
        Prerequisites.model_validate_json(row["prereqs_json"])
        if row["prereqs_json"]
        else None
    )
    path = [PathSession.model_validate(p) for p in json.loads(row["path_json"])]
    history = [HistoryEntry(**h) for h in json.loads(row["history_json"])]
    return BuilderRecord(
        id=row["id"],
        state=state,
        prerequisites=prereqs,
        path=path,
        readiness_pct=row["readiness_pct"],
        history=history,
    )


def append_history(builder_id: str, entry: HistoryEntry) -> None:
    """Append a single history entry. Caller updates path separately."""
    init_db()
    with _conn() as conn:
        row = conn.execute(
            "SELECT history_json FROM builders WHERE id = ?", (builder_id,)
        ).fetchone()
        existing = json.loads(row["history_json"]) if row else []
        existing.append(entry.__dict__)
        conn.execute(
            "UPDATE builders SET history_json = ?, updated_at = ? WHERE id = ?",
            (json.dumps(existing), time.time(), builder_id),
        )
