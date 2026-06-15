"""Builder GPS MCP server (stdio transport).

Four tools, no auth flows, no extra state. The builder_id from
$BUILDER_GPS_BUILDER_ID becomes the cookie on every httpx call.

Run:
    BUILDER_GPS_BUILDER_ID=<uuid> builder-gps-mcp
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from mcp.server.fastmcp import FastMCP

from .api_client import ApiError, BuilderGpsClient

SAIGON = ZoneInfo("Asia/Saigon")
DEFAULT_API_URL = "http://localhost:8000"

mcp = FastMCP("builder-gps")
_client: BuilderGpsClient | None = None


def _get_client() -> BuilderGpsClient:
    """Lazy-init singleton. Surfaces config errors as MCP tool errors."""
    global _client
    if _client is not None:
        return _client
    builder_id = os.environ.get("BUILDER_GPS_BUILDER_ID", "").strip()
    if not builder_id:
        raise RuntimeError(
            "BUILDER_GPS_BUILDER_ID env var not set. "
            "Copy the builder_id from the web app footer (Connect via MCP "
            "panel) and add it to your MCP client config."
        )
    base = os.environ.get("BUILDER_GPS_API_URL", DEFAULT_API_URL)
    _client = BuilderGpsClient(base, builder_id)
    return _client


def _safe_call(fn, *args, **kwargs) -> dict[str, Any]:
    """Convert ApiError → structured tool failure so the LLM can recover."""
    try:
        return fn(*args, **kwargs)
    except ApiError as e:
        return {
            "ok": False,
            "error": str(e),
            "hint": (
                "If status=400/404, the builder probably hasn't submitted "
                "their goal yet — open the web app and fill the form."
            ),
        }
    except RuntimeError as e:
        return {"ok": False, "error": str(e)}


def _enrich(path: dict[str, Any]) -> dict[str, Any]:
    """Attach session catalog details to each PathSession entry."""
    catalog = {s["id"]: s for s in _get_client().get_sessions()}
    enriched: list[dict[str, Any]] = []
    for ps in path.get("sessions", []):
        s = catalog.get(ps["session_id"])
        if s is None:
            enriched.append(ps)
            continue
        enriched.append({**ps, "session": s})
    return {**path, "sessions": enriched}


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool()
def get_path() -> dict[str, Any]:
    """Return the builder's current AABW path.

    Includes prerequisites (capabilities to acquire), each path session with
    full schedule details (day, start, end, venue, title, signup_url), and
    overall readiness percentage.
    """
    return _safe_call(lambda: _enrich(_get_client().get_path()))


@mcp.tool()
def get_next_session(now_iso: str | None = None) -> dict[str, Any]:
    """Return the next recommended session relative to `now_iso` (Asia/Saigon).

    Defaults to actual now. Skips sessions already marked attended/skipped.
    Returns null if no future session remains.
    """
    try:
        now = (
            datetime.fromisoformat(now_iso).astimezone(SAIGON)
            if now_iso
            else datetime.now(timezone.utc).astimezone(SAIGON)
        )
    except ValueError as e:
        return {"ok": False, "error": f"Invalid now_iso: {e}"}

    def _impl() -> dict[str, Any]:
        path = _get_client().get_path()
        catalog = {s["id"]: s for s in _get_client().get_sessions()}
        upcoming: list[dict[str, Any]] = []
        for ps in path.get("sessions", []):
            if ps.get("status") in ("attended", "skipped"):
                continue
            s = catalog.get(ps["session_id"])
            if s is None:
                continue
            start = _parse_session_start(s)
            if start is None or start < now:
                continue
            upcoming.append(
                {
                    "session_id": ps["session_id"],
                    "reason": ps.get("reason", ""),
                    "session": s,
                    "starts_at_iso": start.isoformat(),
                }
            )
        upcoming.sort(key=lambda x: x["starts_at_iso"])
        if not upcoming:
            return {"ok": True, "next": None, "msg": "No future sessions."}
        return {"ok": True, "next": upcoming[0]}

    return _safe_call(_impl)


@mcp.tool()
def mark_session(session_id: str, status: str) -> dict[str, Any]:
    """Mark a session and trigger a reroute.

    status must be one of: attended, skipped, blocked.
    Returns the new path + a `last_change` diff explaining what shifted.
    """
    if status not in ("attended", "skipped", "blocked"):
        return {"ok": False, "error": f"Invalid status: {status}"}
    return _safe_call(lambda: _get_client().mark_session(session_id, status))


@mcp.tool()
def regenerate_path() -> dict[str, Any]:
    """Recompute the path against current state + history without mutating it.

    Use when the builder wants a fresh suggestion (e.g. "give me another plan").
    """
    return _safe_call(lambda: _get_client().regenerate())


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# AABW Jul 8 (Tue) - Jul 12 (Sat) 2026. Same constants as ical_export.
AABW_DATES = {
    1: "2026-07-08",
    2: "2026-07-09",
    3: "2026-07-10",
    4: "2026-07-11",
    5: "2026-07-12",
}


def _parse_session_start(session: dict[str, Any]) -> datetime | None:
    """Compose Asia/Saigon datetime from session.day + session.start (HH:MM)."""
    date = AABW_DATES.get(session.get("day"))
    start = session.get("start")
    if not date or not start:
        return None
    try:
        return datetime.fromisoformat(f"{date}T{start}:00").replace(tzinfo=SAIGON)
    except ValueError:
        return None


def main() -> None:
    """Entrypoint for `builder-gps-mcp` script."""
    try:
        mcp.run()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
