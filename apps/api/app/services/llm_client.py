"""Groq LLM client with structured-output helper.

Groq runs Llama 3.3 70B etc. at very low latency on a generous free tier.
Same `structured()` interface as before — swapping providers is one file.

Strategy:
- Use OpenAI-compatible Groq SDK.
- Force JSON via `response_format={"type": "json_object"}`.
- Inline the Pydantic schema into the system prompt so the model emits a
  valid shape on the first try; Pydantic validates the response.
- Retry on parse/validation errors.
"""

from __future__ import annotations

import json
import logging
import time
from typing import TypeVar

from groq import Groq
from pydantic import BaseModel, ValidationError

from app.config import get_settings

logger = logging.getLogger("llm")
logger.setLevel(logging.INFO)

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    pass


def _client() -> Groq:
    settings = get_settings()
    if not settings.groq_api_key:
        raise LLMError(
            "GROQ_API_KEY is not set. Add it to builder-gps/.env. "
            "Get a free key at https://console.groq.com/keys."
        )
    return Groq(api_key=settings.groq_api_key)


def structured(
    *,
    model: str,
    system: str,
    user: str,
    response_schema: type[T],
    temperature: float = 0.3,
    max_retries: int = 2,
) -> T:
    """Run a single LLM call and parse the response into `response_schema`."""
    client = _client()
    schema_dict = response_schema.model_json_schema()
    schema_block = json.dumps(schema_dict, indent=2)
    full_system = (
        f"{system}\n\n"
        "Return JSON only. Match this JSON Schema EXACTLY — no extra fields, "
        "no missing required fields, no surrounding prose:\n"
        f"{schema_block}"
    )

    last_err: Exception | None = None
    for attempt in range(max_retries + 1):
        t0 = time.perf_counter()
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=temperature,
            )
        except Exception as exc:  # pragma: no cover — network/auth errors
            last_err = exc
            logger.warning("llm call failed (attempt %d): %s", attempt + 1, exc)
            time.sleep(0.5 * (attempt + 1))
            continue

        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        text = (response.choices[0].message.content or "").strip()

        try:
            payload = json.loads(text)
            parsed = response_schema.model_validate(payload)
            logger.info(
                "llm %s schema=%s ok in %dms",
                model,
                response_schema.__name__,
                elapsed_ms,
            )
            return parsed
        except (json.JSONDecodeError, ValidationError) as exc:
            last_err = exc
            logger.warning(
                "llm parse failed (attempt %d, %dms): %s — raw: %r",
                attempt + 1,
                elapsed_ms,
                exc,
                text[:300],
            )

    raise LLMError(f"LLM returned unparseable output after retries: {last_err}")
