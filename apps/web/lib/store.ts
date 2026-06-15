"use client";

import { create } from "zustand";
import type { PathDiff, PathResponse } from "@shared/types";

type View = "form" | "timeline";

interface RerouteNotice {
  diffs: PathDiff[];
  readinessDelta: number;
  ts: number;
}

interface BuilderGpsState {
  view: View;
  path: PathResponse | null;
  reroute: RerouteNotice | null;

  showForm: () => void;
  showTimeline: () => void;
  setPath: (next: PathResponse, prevReadiness?: number) => void;
  dismissReroute: () => void;
}

export const useBuilderGps = create<BuilderGpsState>((set) => ({
  view: "form",
  path: null,
  reroute: null,

  showForm: () => set({ view: "form" }),
  showTimeline: () => set({ view: "timeline" }),

  setPath: (next, prevReadiness) => {
    const diffs = next.last_change ?? [];
    const reroute: RerouteNotice | null =
      diffs.length > 0
        ? {
            diffs,
            readinessDelta:
              prevReadiness !== undefined ? next.readiness_pct - prevReadiness : 0,
            ts: Date.now(),
          }
        : null;
    set({ path: next, reroute, view: "timeline" });
  },

  dismissReroute: () => set({ reroute: null }),
}));
