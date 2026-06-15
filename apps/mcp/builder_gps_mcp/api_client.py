"""Thin httpx wrapper around the Builder GPS FastAPI backend.

The cookie jar holds `builder_gps_id` so we reuse the cookie-bound web routes
verbatim — no parallel auth surface.
"""

from __future__ import annotations

from typing import Any

import httpx


class ApiError(RuntimeError):
    """HTTP-level failure from the backend (status + body)."""

    def __init__(self, status: int, body: str) -> None:
        super().__init__(f"[{status}] {body}")
        self.status = status
        self.body = body


class BuilderGpsClient:
    """Sync httpx wrapper. One client per MCP server lifetime."""

    def __init__(self, base_url: str, builder_id: str, timeout: float = 30.0):
        self._base = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self._base,
            cookies={"builder_gps_id": builder_id},
            timeout=timeout,
            headers={"User-Agent": "builder-gps-mcp/0.1"},
        )
        self.builder_id = builder_id

    def close(self) -> None:
        self._client.close()

    # -- read --------------------------------------------------------------

    def get_path(self) -> dict[str, Any]:
        """Return the current PathResponse JSON."""
        return self._json("GET", "/path")

    def get_sessions(self) -> list[dict[str, Any]]:
        """Return the full session catalog (read-only)."""
        return self._json("GET", "/sessions")

    # -- mutate ------------------------------------------------------------

    def mark_session(self, session_id: str, status: str) -> dict[str, Any]:
        """attended | skipped | blocked → triggers a reroute."""
        return self._json(
            "POST",
            f"/sessions/{session_id}/mark",
            json={"status": status},
        )

    def regenerate(self) -> dict[str, Any]:
        """Recompute path against current state + history. No state change."""
        return self._json("POST", "/path/regenerate")

    # -- internal ----------------------------------------------------------

    def _json(self, method: str, path: str, **kw: Any) -> Any:
        r = self._client.request(method, path, **kw)
        if r.status_code >= 400:
            raise ApiError(r.status_code, r.text)
        return r.json()
