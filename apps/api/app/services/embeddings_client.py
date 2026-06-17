"""Voyage AI embeddings client.

v1 model: voyage-3-lite (512 dims). Synchronous to match the
existing decompose_goal / compute_path service style. Batch up to
1000 texts per call; 44 catalog sessions fit comfortably in one call.
"""

from __future__ import annotations

from voyageai import Client

from app.config import get_settings


def embed_texts(
    texts: list[str],
    *,
    input_type: str = "document",
) -> list[list[float]]:
    """Embed a batch of texts via Voyage.

    Args:
        texts: list of strings to embed.
        input_type: "document" for the catalog at bootstrap time, "query"
            for the runtime capability lookup. Mismatched input_type
            degrades similarity by ~5-10% per Voyage docs.

    Returns:
        Embedding vectors in the same order as `texts`.

    Raises:
        RuntimeError: if VOYAGE_API_KEY is not set.
    """
    s = get_settings()
    if not s.voyage_api_key:
        raise RuntimeError(
            "VOYAGE_API_KEY missing — set it in apps/api/.env"
        )
    vo = Client(api_key=s.voyage_api_key)
    result = vo.embed(
        texts=texts,
        model=s.embedding_model,
        input_type=input_type,
    )
    return result.embeddings
