"""Env-driven config. Loaded once at startup via Settings()."""

from __future__ import annotations

import json
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
    # Stored as raw string to dodge pydantic-settings' JSON-decode-on-list
    # behavior, which would crash on values like `*` or `a,b`. Parsed into a
    # list by the `cors_origins` property below. Accepts:
    #   *                                    -> ["*"]
    #   https://a.com,https://b.com          -> ["https://a.com", "https://b.com"]
    #   ["https://x.com","https://y.com"]    -> ["https://x.com", "https://y.com"]
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    sqlite_path: str = "builder_gps.db"

    # Cross-site cookie behavior. Local dev: `lax` + secure=False (cookie
    # works over plain http://localhost). Production with split subdomains
    # under a Public Suffix Listed domain (like *.up.railway.app): must be
    # `none` + secure=True or the browser drops the cookie on cross-site
    # XHR and /builder/me 404s on every page load.
    cookie_samesite: str = "lax"
    cookie_secure: bool = False

    # Groq + Llama 3.3 70B is the default — generous free tier, ~300ms
    # latency, JSON mode works. To swap providers, change llm_client.py only.
    model_decompose: str = "llama-3.3-70b-versatile"
    model_compute_path: str = "llama-3.3-70b-versatile"

    # === Agentic stack (Phase 01) ===
    # Pick the tool-calling backend. Options: "groq" | "cerebras" | "anthropic".
    # Cerebras + Groq both run Llama 3.3 70B via an OpenAI-compatible API —
    # they're hot-swappable. Cerebras has a more generous free tier
    # (1M tokens/day vs Groq's 100K). Anthropic is post-Devpost.
    agent_client_provider: str = "groq"

    # Per-provider model IDs. The agent_client picks the right one based on
    # `agent_client_provider`. The critic uses model_critic regardless,
    # falling back to the same provider used for the decompose agent.
    model_decompose_agent: str = "llama-3.3-70b-versatile"
    model_critic: str = "llama-3.3-70b-versatile"
    decompose_max_iterations: int = 6
    decompose_coverage_threshold: float = 0.8
    critic_readiness_threshold: float = 0.75
    critic_max_retries: int = 2
    # gpt-oss-120b on Cerebras is ~60s per critic call which compounds with
    # retries and trips the request queue. Off by default on Cerebras; the
    # decompose agent's evaluate_coverage tool already provides self-eval.
    critic_enabled: bool = True

    # Cerebras (alternate inference provider — much higher free daily quota).
    # Free tier exposes gpt-oss-120b and zai-glm-4.7. Llama is paywalled on
    # Cerebras; use gpt-oss for tool calling since it's purpose-built for it.
    cerebras_api_key: str = ""
    cerebras_model: str = "gpt-oss-120b"

    # Anthropic (DEFERRED — fields declared, unused in v1).
    anthropic_api_key: str = ""
    claude_decompose_model: str = "claude-sonnet-4-6"
    claude_critic_model: str = "claude-haiku-4-5-20251001"

    # Voyage AI — embeddings shortlist (Phase 02).
    voyage_api_key: str = ""
    embedding_model: str = "voyage-3-lite"
    shortlist_size: int = 12

    # Tavily — web search tool inside the decompose agent (Phase 03).
    tavily_api_key: str = ""
    tavily_timeout_seconds: int = 8

    @property
    def cors_origins_list(self) -> list[str]:
        s = self.cors_origins.strip()
        if not s:
            return []
        if s.startswith("["):
            return json.loads(s)
        return [part.strip() for part in s.split(",") if part.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
