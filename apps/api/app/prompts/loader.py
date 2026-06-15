"""Prompt loader. Reads `<name>.md` from this directory, caches in-process.

Use `.format(**kwargs)` substitution for placeholders (`{known_tags}` etc).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_DIR = Path(__file__).parent


@lru_cache(maxsize=16)
def _read(name: str) -> str:
    path = _DIR / f"{name}.md"
    if not path.is_file():
        raise FileNotFoundError(
            f"Prompt '{name}' not found at {path}. "
            "Expected a markdown file next to loader.py."
        )
    return path.read_text(encoding="utf-8").strip()


def load_prompt(name: str, **fmt_kwargs: str) -> str:
    """Load `<name>.md` and run `.format(**fmt_kwargs)` if any kwargs given.

    Examples:
        load_prompt("compute-path")
        load_prompt("decompose-goal", known_tags="anthropic, openai, ...")
    """
    raw = _read(name)
    if not fmt_kwargs:
        return raw
    return raw.format(**fmt_kwargs)
