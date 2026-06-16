"""Env-driven config. Loaded once at startup via Settings()."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    # apps/api/.env — co-located with this app (two levels up from app/).
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    groq_api_key: str = ""
    # NoDecode skips pydantic-settings' default JSON-decode pass so the
    # raw string reaches our validator below. Without it, plain values
    # like `*` or `https://a,https://b` crash on startup.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    sqlite_path: str = "builder_gps.db"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v: object) -> object:
        # Accept any of: `*`, `a,b,c`, `["a","b"]`. Pydantic's default tries
        # JSON-only, which crashes Railway deploys when ops set `*` or
        # comma-separated values.
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                return json.loads(s)
            return [part.strip() for part in s.split(",") if part.strip()]
        return v

    # Groq + Llama 3.3 70B is the default — generous free tier, ~300ms
    # latency, JSON mode works. To swap providers, change llm_client.py only.
    model_decompose: str = "llama-3.3-70b-versatile"
    model_compute_path: str = "llama-3.3-70b-versatile"


@lru_cache
def get_settings() -> Settings:
    return Settings()
