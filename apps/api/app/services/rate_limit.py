"""Per-person rate limit for goal-change endpoints.

Keys requests by the cookie-bound builder_id when present, else by client
IP. Sliding window counter held in memory — single Railway container, no
Redis needed. Defaults: 5 calls per 15 minutes. Tunable via env.

Applied as a FastAPI dependency on the two routes that count as
"changing the goal": POST /builder/state and POST /path/regenerate.
Marking sessions (attended/skipped) is normal use and NOT limited.
"""

from __future__ import annotations

import time
from collections import deque
from threading import Lock

from fastapi import Cookie, HTTPException, Request

from app.config import get_settings

# Module-level state. Buckets keyed by (cookie_id or ip).
# A simple Lock is enough — FastAPI hands off requests across an event
# loop, and the critical section here is microseconds.
_buckets: dict[str, deque[float]] = {}
_buckets_lock = Lock()

BUILDER_COOKIE = "builder_gps_id"


def _bucket_key(builder_gps_id: str | None, request: Request) -> str:
    """Prefer cookie (per-person), fall back to IP (anonymous abusers).

    Cookie ID is the most accurate "per person" signal because a returning
    user keeps the same cookie across IP changes (laptop → phone). When
    the cookie is missing (first request), we have nothing else to key on.
    """
    if builder_gps_id:
        return f"cookie:{builder_gps_id}"
    ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"


def enforce_goal_change_rate_limit(
    request: Request,
    builder_gps_id: str | None = Cookie(default=None),
) -> None:
    """FastAPI dependency. Raises 429 if the caller has used up their quota.

    Implementation: sliding window. We track timestamps of recent allowed
    requests per key, drop ones outside the window, and reject when the
    remaining count would exceed `max_calls`.
    """
    settings = get_settings()
    max_calls = settings.goal_change_max_calls
    window = settings.goal_change_window_seconds

    # Disabled when max_calls <= 0. Lets organizers turn the limit off in
    # the post-win deployment by setting GOAL_CHANGE_MAX_CALLS=0.
    if max_calls <= 0:
        return

    key = _bucket_key(builder_gps_id, request)
    now = time.time()

    with _buckets_lock:
        bucket = _buckets.setdefault(key, deque())
        # Trim timestamps that have aged out.
        while bucket and bucket[0] < now - window:
            bucket.popleft()
        if len(bucket) >= max_calls:
            retry_after = max(1, int(window - (now - bucket[0])))
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Goal change limit hit ({max_calls} per "
                    f"{window // 60} min). Try again in "
                    f"{retry_after // 60}m {retry_after % 60}s."
                ),
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)
