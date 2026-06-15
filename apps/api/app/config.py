"""Env-driven config. Loaded once at startup via Settings()."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # apps/api/.env — co-located with this app (two levels up from app/).
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    groq_api_key: str = ""
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    sqlite_path: str = "builder_gps.db"

    # Groq + Llama 3.3 70B is the default — generous free tier, ~300ms
    # latency, JSON mode works. To swap providers, change llm_client.py only.
    model_decompose: str = "llama-3.3-70b-versatile"
    model_compute_path: str = "llama-3.3-70b-versatile"


@lru_cache
def get_settings() -> Settings:
    return Settings()
