"""Bootstrap session embeddings via Voyage AI.

Run from apps/api/:
    venv/bin/python scripts/bootstrap-embeddings.py

Idempotent. Re-running with the same `embedding_model` touches 0 rows.
Re-embeds every row when the env var changes (e.g. swap voyage-3-lite
to voyage-3). Designed to be safe to call on every Railway deploy.

Exit codes:
    0 — embeddings table now matches the configured model
    1 — VOYAGE_API_KEY missing, sessions.json missing/empty, or API error
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make `app.*` importable when run as `python scripts/bootstrap-embeddings.py`.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.schemas import Session  # noqa: E402
from app.services.embeddings_client import embed_texts  # noqa: E402
from app.services.schedule_loader import reload_sessions  # noqa: E402
from app.storage.embeddings_store import (  # noqa: E402
    get_embedding_for,
    init_embeddings_table,
    upsert_embedding,
)


def _embeddable_text(session: Session) -> str:
    """Compose the string we hand to Voyage per session.

    Concatenates title + description + tags so semantic match catches both
    explicit topic words and catalog metadata like 'mcp' or 'voice-agent'.
    """
    tags = ", ".join(session.tags) if session.tags else "(none)"
    return f"{session.title}\n\n{session.description}\n\nTags: {tags}"


def main() -> int:
    settings = get_settings()
    if not settings.voyage_api_key:
        print(
            "ERROR: VOYAGE_API_KEY not set in apps/api/.env",
            file=sys.stderr,
        )
        return 1

    init_embeddings_table()
    sessions = reload_sessions()
    if not sessions:
        print(
            "ERROR: no sessions found — is data/sessions.json populated?",
            file=sys.stderr,
        )
        return 1

    print(
        f"Loaded {len(sessions)} sessions. "
        f"Model: {settings.embedding_model}"
    )

    to_embed: list[Session] = []
    unchanged = 0
    for session in sessions:
        existing = get_embedding_for(session.id)
        if existing and existing[1] == settings.embedding_model:
            unchanged += 1
        else:
            to_embed.append(session)

    if not to_embed:
        print(
            f"Embedded 0 new, {unchanged} unchanged, "
            f"model={settings.embedding_model}"
        )
        return 0

    print(f"Embedding {len(to_embed)} session(s)...")
    texts = [_embeddable_text(s) for s in to_embed]

    try:
        vectors = embed_texts(texts, input_type="document")
    except Exception as exc:  # noqa: BLE001 — surface any Voyage error
        print(f"ERROR: Voyage API failed: {exc}", file=sys.stderr)
        return 1

    if len(vectors) != len(to_embed):
        print(
            f"ERROR: requested {len(to_embed)} embeddings, "
            f"got {len(vectors)}",
            file=sys.stderr,
        )
        return 1

    for session, vector in zip(to_embed, vectors):
        upsert_embedding(session.id, vector, settings.embedding_model)

    print(
        f"Embedded {len(to_embed)} new, {unchanged} unchanged, "
        f"model={settings.embedding_model}"
    )
    print(f"Vector dimension: {len(vectors[0])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
