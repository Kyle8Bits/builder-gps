// Shared types between FastAPI backend and Next.js frontend.
// MUST match Pydantic schemas in apps/api/app/schemas.py.

export type Experience = "beginner" | "intermediate" | "advanced";
export type TeamSize = "solo" | "small" | "large";
export type Level = "intro" | "intermediate" | "deep";
export type MarkStatus = "attended" | "skipped" | "blocked" | "recommended";
export type DiffOp = "added" | "removed" | "reordered";
export type Source = "confirmed" | "mock";
export type Day = 1 | 2 | 3 | 4 | 5;

export interface Health {
  status: string;
  version: string;
}

export interface BuilderState {
  goal: string;
  stack: string[];
  experience: Experience;
  team_size: TeamSize;
  hours_per_day: number;
}

export interface Session {
  id: string;
  day: Day;
  start: string;
  end: string;
  venue: string;
  partner: string | null;
  title: string;
  description: string;
  tags: string[];
  level: Level;
  source: Source;
  signup_url: string | null;
}

export interface Capability {
  name: string;
  why: string;
  matching_tags: string[];
}

export interface Prerequisites {
  capabilities: Capability[];
  success_criteria: string[];
}

export interface PathSession {
  session_id: string;
  reason: string;
  status: MarkStatus;
}

export interface PathDiff {
  op: DiffOp;
  session_id: string;
  reason: string;
}

export interface PathResponse {
  prerequisites: Prerequisites;
  sessions: PathSession[];
  readiness_pct: number;
  last_change: PathDiff[] | null;
}
