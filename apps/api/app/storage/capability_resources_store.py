"""SQLite store for Tavily-sourced resource links per (capability, builder).

The decompose agent calls Tavily during its loop; we cache the normalized
ResourceLink list keyed by `(capability_slug, builder_id)`. Phase 05's
/path/resources endpoint reads these rows back out.

Slug is deterministic so the agent and the read path agree on the key.
"""

from __future__ import annotations

import json
import re
import time
from threading import Lock

from app.schemas import ResourceLink
from app.storage.sqlite_store import _conn

_TABLE_INIT_LOCK = Lock()
_TABLE_INITIALIZED = False


def init_capability_resources_table() -> None:
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
                CREATE TABLE IF NOT EXISTS capability_resources (
                    capability_slug TEXT NOT NULL,
                    builder_id      TEXT NOT NULL,
                    resources_json  TEXT NOT NULL,
                    created_at      REAL NOT NULL,
                    PRIMARY KEY (capability_slug, builder_id)
                )
                """
            )
        _TABLE_INITIALIZED = True


_SLUG_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def slugify(name: str) -> str:
    """Deterministic kebab-slug for capability names.

    Lowercase, non-alnum collapsed to single dash, trimmed of leading/trailing
    dashes. Used as a stable key across writes (agent) and reads (Phase 05).
    """
    return _SLUG_NON_ALNUM.sub("-", name.lower()).strip("-")


def upsert_capability_resources(
    capability_slug: str,
    builder_id: str,
    resources: list[ResourceLink],
) -> None:
    """Insert-or-replace the resource list for one (capability, builder)."""
    init_capability_resources_table()
    payload = json.dumps([r.model_dump(mode="json") for r in resources])
    with _conn() as conn:
        conn.execute(
            """
            INSERT INTO capability_resources
                (capability_slug, builder_id, resources_json, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(capability_slug, builder_id) DO UPDATE SET
                resources_json=excluded.resources_json,
                created_at=excluded.created_at
            """,
            (capability_slug, builder_id, payload, time.time()),
        )


def get_capability_resources(builder_id: str) -> dict[str, list[ResourceLink]]:
    """Return all resource lists for a builder, keyed by capability_slug."""
    init_capability_resources_table()
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT capability_slug, resources_json
            FROM capability_resources WHERE builder_id = ?
            """,
            (builder_id,),
        ).fetchall()
    out: dict[str, list[ResourceLink]] = {}
    for r in rows:
        try:
            out[r["capability_slug"]] = [
                ResourceLink.model_validate(item)
                for item in json.loads(r["resources_json"])
            ]
        except Exception:
            # Bad row — skip rather than crash the whole read.
            continue
    return out
