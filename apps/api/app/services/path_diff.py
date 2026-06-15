"""Compute the visible diff between two paths.

Used after a session is marked, so the frontend can animate added / removed /
reordered cards with explanations.
"""

from __future__ import annotations

from app.schemas import PathDiff, PathSession


def diff_paths(
    previous: list[PathSession],
    current: list[PathSession],
) -> list[PathDiff]:
    """Return a list of changes between two ordered path-session lists.

    `reason` on each diff comes from the NEW (current) PathSession when
    available; for removals, falls back to a default explanation.
    """
    prev_ids = [p.session_id for p in previous]
    curr_ids = [c.session_id for c in current]

    prev_set = set(prev_ids)
    curr_set = set(curr_ids)
    curr_by_id = {c.session_id: c for c in current}
    prev_by_id = {p.session_id: p for p in previous}

    diffs: list[PathDiff] = []

    # Added — in current but not previous.
    for sid in curr_ids:
        if sid not in prev_set:
            new = curr_by_id[sid]
            diffs.append(
                PathDiff(op="added", session_id=sid, reason=new.reason)
            )

    # Removed — in previous but not current.
    for sid in prev_ids:
        if sid not in curr_set:
            old = prev_by_id[sid]
            diffs.append(
                PathDiff(
                    op="removed",
                    session_id=sid,
                    reason=_removed_reason(old.status, old.reason),
                )
            )

    # Reordered — kept sessions whose position changed.
    kept = [sid for sid in curr_ids if sid in prev_set]
    prev_kept = [sid for sid in prev_ids if sid in curr_set]
    if kept != prev_kept:
        moved = {sid for sid, p_sid in zip(kept, prev_kept) if sid != p_sid}
        for sid in moved:
            new = curr_by_id[sid]
            diffs.append(
                PathDiff(op="reordered", session_id=sid, reason=new.reason)
            )

    return diffs


def _removed_reason(status: str, reason: str) -> str:
    if status == "attended":
        return f"You marked this attended — no longer recommending."
    if status == "skipped":
        return f"You skipped this — replaced with an alternative."
    return f"Replaced by a better fit: {reason}"
