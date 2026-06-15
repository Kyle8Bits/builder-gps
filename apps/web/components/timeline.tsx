"use client";

import { useMemo } from "react";

import { CalendarExportPanel } from "@/components/calendar-export";
import { DayBlock } from "@/components/day-block";
import { Logo } from "@/components/logo";
import { ReadinessBar } from "@/components/readiness-bar";
import { RerouteNotice } from "@/components/reroute-notice";
import { useSessions } from "@/lib/use-sessions";
import { useBuilderGps } from "@/lib/store";
import type { PathSession, Session } from "@shared/types";

export function Timeline() {
  const path = useBuilderGps((s) => s.path);
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
        <button
          type="button"
          onClick={showForm}
          className="cursor-pointer rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-400 transition-colors duration-150 hover:border-neutral-600 hover:text-neutral-100"
        >
          ← Edit goal
        </button>
      </header>

      <div className="flex flex-col gap-5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 backdrop-blur-sm">
        <ReadinessBar
          pct={path.readiness_pct}
          goalLabel={pickGoalLabel(path.prerequisites.capabilities)}
          totalSessions={onPathCount}
        />
        <PrerequisitesPanel
          capabilities={path.prerequisites.capabilities.map((c) => c.name)}
          criteria={path.prerequisites.success_criteria}
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

function PrerequisitesPanel({
  capabilities,
  criteria,
}: {
  capabilities: string[];
  criteria: string[];
}) {
  return (
    <details className="group rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-3 text-xs">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 text-neutral-300">
        <span>
          What you need to learn ·{" "}
          <span className="text-neutral-500">
            {capabilities.length} capabilities, {criteria.length} checkpoints
          </span>
        </span>
        <span className="text-neutral-600 transition-transform duration-200 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300">
            Prerequisites
          </div>
          <ol className="list-decimal space-y-1 pl-4 text-neutral-300">
            {capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-300">
            Success by Friday
          </div>
          <ul className="list-disc space-y-1 pl-4 text-neutral-300">
            {criteria.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

function pickGoalLabel(caps: { name: string }[]) {
  const first = caps[0]?.name ?? "Demo Day";
  return first.length > 64 ? `${first.slice(0, 64)}…` : first;
}
