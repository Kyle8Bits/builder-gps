import type {
  Experience,
  PathResponse,
} from "@shared/types";

/**
 * Pre-baked landing-page persona. The initial path is what visitors see when
 * they switch personas. altPaths is a lookup keyed by `{session_id}:{status}`
 * — when the visitor taps "Mark attended" / "Mark skipped" on the landing
 * demo, we serve the matching alt path instantly, no LLM call.
 *
 * Keeping data static is intentional: the landing is a voter funnel, not a
 * sandbox, and burning Groq tokens on every drive-by would kill the budget.
 */
export interface Persona {
  id: string;
  label: string;
  goal: string;
  stack: string[];
  experience: Experience;
  initial: PathResponse;
  /** Keyed by `${session_id}:${status}` */
  altPaths: Record<string, PathResponse>;
}
