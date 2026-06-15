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
