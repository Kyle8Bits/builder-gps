"use client";

import { create } from "zustand";
import type {
  CapabilityResourcesMap,
  PathDiff,
  PathResponse,
} from "@shared/types";

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
  // Phase 07 — knowledge layer. Keyed by Capability.slug, populated by
  // GET /path/resources after a path is loaded. Empty map is valid.
  resources: CapabilityResourcesMap;

  showForm: () => void;
  showTimeline: () => void;
  setPath: (next: PathResponse, prevReadiness?: number) => void;
  // Restore a returning user's path from /path on mount. Skips the reroute
  // notice — a page reload isn't a "live change", so don't flash diffs.
  hydratePath: (next: PathResponse) => void;
  setResources: (next: CapabilityResourcesMap) => void;
  dismissReroute: () => void;
}

export const useBuilderGps = create<BuilderGpsState>((set) => ({
  view: "form",
  path: null,
  reroute: null,
  resources: {},

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

  hydratePath: (next) => set({ path: next, reroute: null, view: "timeline" }),

  setResources: (next) => set({ resources: next }),

  dismissReroute: () => set({ reroute: null }),
}));
