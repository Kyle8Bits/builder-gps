"""Cosine-similarity shortlist of catalog sessions for a capability text.

Wedged between Phase 03's decompose-agent output and the existing
compute_path() so the LLM only sees the ~K most semantically relevant
sessions instead of all 44. Reduces hallucination + drops token cost.

Returns the original `sessions` list unmodified if the embeddings table
is empty (e.g. before bootstrap-embeddings.py has been run) so the
pipeline keeps working during development.
"""

from __future__ import annotations

import json

import numpy as np

from app.config import get_settings
from app.schemas import Session
from app.services.embeddings_client import embed_texts
from app.storage.embeddings_store import get_all_embeddings


def shortlist_sessions(
    capability_text: str,
    sessions: list[Session],
    k: int | None = None,
) -> list[Session]:
    """Embed capability text, rank pre-embedded sessions by cosine, return top-K.

    Args:
        capability_text: free-form text describing what to filter for.
            Typical input: the agent's `prereqs.capabilities` flattened into
            one space-joined string.
        sessions: full catalog. We only return entries present in this list,
            so the caller controls which sessions are candidates.
        k: max sessions to return. Defaults to settings.shortlist_size.

    Returns:
        Top-K Session objects ordered by similarity descending.
        Returns input list unchanged if the embeddings table is empty.
    """
    s = get_settings()
    k = k or s.shortlist_size

    rows = get_all_embeddings()
    if not rows:
        # No embeddings yet — degrade gracefully to "all sessions" so the
        # pipeline runs in dev environments before bootstrap.
        return sessions

    query_vec = np.array(
        embed_texts([capability_text], input_type="query")[0]
    )
    q_norm = float(np.linalg.norm(query_vec))
    if q_norm == 0:
        return sessions

    by_id = {sess.id: sess for sess in sessions}
    scored: list[tuple[float, str]] = []
    for sess_id, vec_json, _model in rows:
        if sess_id not in by_id:
            continue
        v = np.array(json.loads(vec_json))
        v_norm = float(np.linalg.norm(v))
        if v_norm == 0:
            continue
        sim = float(np.dot(query_vec, v) / (q_norm * v_norm))
        scored.append((sim, sess_id))

    scored.sort(reverse=True)
    top_ids = [sid for _, sid in scored[:k]]
    return [by_id[sid] for sid in top_ids if sid in by_id]
