"""Pydantic schemas — source of truth for the Builder GPS API contract.

MUST stay in sync with packages/shared/types.ts (frontend mirror).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Experience = Literal["beginner", "intermediate", "advanced"]
TeamSize = Literal["solo", "small", "large"]
Level = Literal["intro", "intermediate", "deep"]
MarkStatus = Literal["attended", "skipped", "blocked", "recommended"]
DiffOp = Literal["added", "removed", "reordered"]
Day = Literal[1, 2, 3, 4, 5]
# "confirmed" = real AABW workshop from event organizers (signup link present).
# "mock" = synthetic workshop seeded for path-finding density.
Source = Literal["confirmed", "mock"]


class Health(BaseModel):
    status: str
    version: str


class BuilderState(BaseModel):
    """Builder profile submitted from the 5-field form."""

    goal: str = Field(min_length=4, max_length=400)
    stack: list[str] = Field(default_factory=list, max_length=20)
    experience: Experience
    team_size: TeamSize
    hours_per_day: int = Field(ge=4, le=16)


class Session(BaseModel):
    """A single AABW workshop / event slot (real or synthetic)."""

    id: str
    day: Day
    start: str
    end: str
    venue: str
    partner: str | None = None
    title: str
    description: str
    tags: list[str] = Field(default_factory=list)
    level: Level
    source: Source = "mock"
    signup_url: str | None = None


class Capability(BaseModel):
    """One prerequisite the builder must acquire to hit their goal."""

    name: str
    why: str
    matching_tags: list[str] = Field(default_factory=list)
    # Server-computed kebab slug for cross-referencing with /path/resources.
    # Empty for legacy persisted rows; populated by decompose_agent on write.
    slug: str = ""


class Prerequisites(BaseModel):
    capabilities: list[Capability]
    success_criteria: list[str] = Field(default_factory=list)


class PathSession(BaseModel):
    """A session selected for the builder's path."""

    session_id: str
    reason: str
    status: MarkStatus = "recommended"


class PathDiff(BaseModel):
    op: DiffOp
    session_id: str
    reason: str


class PathResponse(BaseModel):
    prerequisites: Prerequisites
    sessions: list[PathSession]
    readiness_pct: int = Field(ge=0, le=100)
    last_change: list[PathDiff] | None = None


class MarkRequest(BaseModel):
    status: MarkStatus


# === Phase 03 — Agentic refactor + knowledge layer ===

ResourceSource = Literal["youtube", "docs", "blog", "github", "other"]


class ResourceLink(BaseModel):
    """A vetted external resource (YouTube video, docs page, blog post)
    surfaced inline under a prerequisite capability. Sourced from the
    Tavily searches the decompose agent runs during its loop.
    """

    title: str = Field(max_length=200)
    url: str = Field(max_length=500)
    source: ResourceSource
    snippet: str = Field(max_length=300)


CriticVerdictLabel = Literal["ok", "weak"]


class CriticVerdict(BaseModel):
    """Phase 04 — output of the self-eval critic that grades each path.

    `verdict` drives the loop: "weak" → re-run compute_path with
    `suggested_constraint` appended to the user prompt.
    """

    verdict: CriticVerdictLabel
    missing_capabilities: list[str] = Field(default_factory=list, max_length=10)
    suggested_constraint: str = Field(default="", max_length=500)
