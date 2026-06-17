"""FastAPI entrypoint for Builder GPS."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routes import admin, builder, path, sessions
from app.schemas import Health
from app.storage.sqlite_store import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)


def create_app() -> FastAPI:
    settings = get_settings()
    init_db()

    app = FastAPI(
        title="Builder GPS API",
        version=__version__,
        description=(
            "Goal-driven AABW path planner. Two LLM calls: decomposeGoal and "
            "computePath. Live reroute on session mark."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=Health)
    async def health() -> Health:
        return Health(status="ok", version=__version__)

    app.include_router(sessions.router)
    app.include_router(builder.router)
    app.include_router(path.router)
    app.include_router(admin.router)
    return app


app = create_app()
