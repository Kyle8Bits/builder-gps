"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSessions } from "@/lib/api-client";
import type { Session } from "@shared/types";

export function useSessions() {
  return useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
    staleTime: 60_000,
  });
}

export function buildSessionMap(sessions: Session[]): Map<string, Session> {
  return new Map(sessions.map((s) => [s.id, s]));
}
