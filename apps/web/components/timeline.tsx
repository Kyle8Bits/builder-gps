"use client";

import { useMemo } from "react";

import { CalendarExportPanel } from "@/components/calendar-export";
import { CapabilityResources } from "@/components/capability-resources";
import { DayBlock } from "@/components/day-block";
import { Logo } from "@/components/logo";
import { PathExportButton } from "@/components/path-export-button";
import { ReadinessBar } from "@/components/readiness-bar";
import { RerouteNotice } from "@/components/reroute-notice";
import { useSessions } from "@/lib/use-sessions";
import { useBuilderGps } from "@/lib/store";
import type {
  Capability,
  CapabilityResourcesMap,
  PathSession,
  Session,
} from "@shared/types";

export function Timeline() {
  const path = useBuilderGps((s) => s.path);
  const resources = useBuilderGps((s) => s.resources);
  const showForm = useBuilderGps((s) => s.showForm);
  const sessionsQuery = useSessions();

  const grouped = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    const byDay: Record<1 | 2 | 3 | 4 | 5, Session[]> = {
      1: [], 2: [], 3: [], 4: [], 5: [],
    };
    for (const s of sessions) byDay[s.day].push(s);
    return byDay;
  }, [sessionsQuery.data]);

  const pathLookup = useMemo(() => {
    const m = new Map<string, PathSession>();
    for (const p of path?.sessions ?? []) m.set(p.session_id, p);
    return m;
  }, [path]);

  if (!path) return null;

  const onPathCount = path.sessions.length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-32 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-3 pt-2">
        <Logo size={28} showWord />
        <div className="flex items-center gap-2">
          <PathExportButton />
          <button
            type="button"
            onClick={showForm}
            className="cursor-pointer rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-400 transition-colors duration-150 hover:border-neutral-600 hover:text-neutral-100"
          >
            ← Edit goal
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 backdrop-blur-sm">
        <ReadinessBar
          pct={path.readiness_pct}
          goalLabel={pickGoalLabel(path.prerequisites.capabilities)}
          totalSessions={onPathCount}
        />
        <PrerequisitesPanel
          capabilities={path.prerequisites.capabilities}
          criteria={path.prerequisites.success_criteria}
          resources={resources}
        />
        <CalendarExportPanel />
      </div>

      {sessionsQuery.isLoading && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-6 text-sm text-neutral-400 animate-shimmer">
          Loading schedule…
        </div>
      )}

      {sessionsQuery.isError && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          Failed to load schedule.
        </div>
      )}

      {sessionsQuery.data && (
        <div className="flex flex-col gap-8">
          {([1, 2, 3, 4, 5] as const).map((day) => (
            <DayBlock
              key={day}
              day={day}
              sessions={grouped[day]}
              pathLookup={pathLookup}
            />
          ))}
        </div>
      )}

      <footer className="mt-2 rounded-xl border border-brand-900/40 bg-brand-950/20 px-4 py-3 text-center text-xs text-brand-300/80">
        🏁 Demo Day · Sat Jul 12 · You vs. your goal.
      </footer>

      <RerouteNotice />
    </div>
  );
}

// Render expanded by default (per Phase 07 brainstorm decision) so voters
// see the agent's research inline without an extra click.
function PrerequisitesPanel({
  capabilities,
  criteria,
  resources,
}: {
  capabilities: Capability[];
  criteria: string[];
  resources: CapabilityResourcesMap;
}) {
  return (
    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-4 text-xs">
      <div className="flex items-center justify-between gap-2 text-neutral-300">
        <span className="font-medium">
          What you need to learn ·{" "}
          <span className="text-neutral-500">
            {capabilities.length} capabilities, {criteria.length} checkpoints
          </span>
        </span>
      </div>

      <ol className="mt-3 flex flex-col gap-3">
        {capabilities.map((c, idx) => (
          <li
            key={c.slug || c.name}
            className="rounded-lg border border-neutral-800/60 bg-neutral-900/40 p-3"
          >
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 text-[10px] font-semibold text-brand-400 tnum">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="font-medium text-neutral-100">{c.name}</span>
            </div>
            {c.why && (
              <div className="mt-1 pl-6 text-[11px] leading-relaxed text-neutral-500">
                {c.why}
              </div>
            )}
            <div className="pl-6">
              <CapabilityResources
                resources={c.slug ? resources[c.slug] : undefined}
              />
            </div>
          </li>
        ))}
      </ol>

      {criteria.length > 0 && (
        <div className="mt-4 border-t border-neutral-800/60 pt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300">
            Success by Friday
          </div>
          <ul className="list-disc space-y-1 pl-4 text-neutral-300">
            {criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function pickGoalLabel(caps: { name: string }[]) {
  const first = caps[0]?.name ?? "Demo Day";
  return first.length > 64 ? `${first.slice(0, 64)}…` : first;
}
