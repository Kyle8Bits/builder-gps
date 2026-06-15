import type { MarkStatus, PathResponse } from "@shared/types";

import { multiAgent } from "./multi-agent";
import { payments } from "./payments";
import type { Persona } from "./types";
import { voiceBot } from "./voice-bot";

export type { Persona } from "./types";
export { DEMO_SESSIONS } from "./demo-sessions";

/**
 * Personas are listed in display order. First one is the default selection
 * when the landing page mounts.
 */
export const PERSONAS: Persona[] = [payments, voiceBot, multiAgent];

const PERSONA_BY_ID: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.id, p])
);

export function getPersona(id: string): Persona {
  return PERSONA_BY_ID[id] ?? PERSONAS[0];
}

/**
 * Look up the alt path for a (persona, session, status) tuple. Falls back to
 * the persona's initial path if no alt was authored — keeps the demo from
 * dead-ending, just won't show a reroute notice.
 *
 * Re-attaches the persona's prerequisites object so the timeline header keeps
 * rendering capabilities + success criteria after a reroute.
 */
export function getDemoPath(
  persona: Persona,
  sessionId: string,
  status: MarkStatus
): PathResponse {
  const key = `${sessionId}:${status}`;
  const alt = persona.altPaths[key];
  if (!alt) return persona.initial;
  return {
    ...alt,
    prerequisites: persona.initial.prerequisites,
  };
}
