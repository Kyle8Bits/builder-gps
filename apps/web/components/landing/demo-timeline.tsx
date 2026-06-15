"use client";

import { useMemo, useState, useTransition } from "react";

import { DemoSessionCard } from "@/components/landing/demo-session-card";
import { PersonaSwitcher } from "@/components/landing/persona-switcher";
import { ReadinessBar } from "@/components/readiness-bar";
import { DAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import {
  DEMO_SESSIONS,
  PERSONAS,
  getDemoPath,
  type Persona,
} from "@/lib/demo-paths";
import type { Day, MarkStatus, PathResponse } from "@shared/types";

const DAY_TINT: Record<Day, string> = {
  1: "from-brand-400/15 to-transparent",
  2: "from-sky-400/12 to-transparent",
  3: "from-violet-400/12 to-transparent",
  4: "from-amber-400/15 to-transparent",
  5: "from-rose-400/15 to-transparent",
};

export function DemoTimeline() {
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const [path, setPath] = useState<PathResponse>(persona.initial);
  const [pending, startTransition] = useTransition();

  function selectPersona(next: Persona) {
    if (next.id === persona.id) return;
    startTransition(() => {
      setPersona(next);
      setPath(next.initial);
    });
  }

  function handleMark(sessionId: string, status: MarkStatus) {
    startTransition(() => {
      setPath(getDemoPath(persona, sessionId, status));
    });
  }

  const grouped = useMemo(() => {
    const by: Record<Day, typeof path.sessions> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const ps of path.sessions) {
      const session = DEMO_SESSIONS[ps.session_id];
      if (!session) continue;
      by[session.day].push(ps);
    }
    return by;
  }, [path]);

  const goalLabel =
    path.prerequisites.capabilities[0]?.name ?? "Demo Day";
  const reroute = path.last_change ?? [];
  const hasReroute = reroute.length > 0;

  return (
    <section
      id="demo"
      className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 sm:px-6"
    >
      <header className="flex flex-col gap-4">
        <PersonaSwitcher activeId={persona.id} onSelect={selectPersona} />
        <p className="text-pretty text-sm text-neutral-400">
          <span className="text-neutral-200">{persona.label}.</span> Goal:{" "}
          <span className="italic">"{persona.goal}"</span>
        </p>
      </header>

      <div
        className={cn(
          "flex flex-col gap-5 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 backdrop-blur-sm transition-opacity duration-200",
          pending && "opacity-70"
        )}
      >
        <ReadinessBar
          pct={path.readiness_pct}
          goalLabel={goalLabel}
          totalSessions={path.sessions.length}
        />

        {hasReroute && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-brand-700/40 bg-brand-500/10 p-3 text-xs text-brand-100">
            <div className="flex items-center gap-1.5 font-semibold text-brand-200">
              <span>↻</span> Path rerouted ({reroute.length}{" "}
              {reroute.length === 1 ? "change" : "changes"})
            </div>
            <ul className="flex flex-col gap-1 pl-3">
              {reroute.map((d) => (
                <li
                  key={`${d.op}-${d.session_id}`}
                  className="text-brand-100/90"
                >
                  <span className={cn("font-mono uppercase", opColor(d.op))}>
                    {d.op}
                  </span>{" "}
                  <span className="text-neutral-300">
                    {DEMO_SESSIONS[d.session_id]?.title ?? d.session_id}
                  </span>{" "}
                  — <span className="text-brand-200/80">{d.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {([1, 2, 3, 4, 5] as const).map((day) => {
          const items = grouped[day];
          if (items.length === 0) return null;
          const meta = DAY_LABELS[day];
          return (
            <section key={day} className="flex flex-col gap-3">
              <header
                className={cn(
                  "relative flex items-end justify-between gap-3 rounded-lg border border-neutral-800/60 px-3 py-2.5",
                  "bg-gradient-to-r from-neutral-950/95 via-neutral-950/90 to-neutral-950/80"
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r opacity-50",
                    DAY_TINT[day]
                  )}
                />
                <div className="relative flex items-baseline gap-3">
                  <div className="font-mono tnum text-2xl font-bold text-neutral-50">
                    {String(day).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                      {meta.theme}
                    </div>
                    <div className="text-xs text-neutral-500">{meta.date}</div>
                  </div>
                </div>
                <div className="relative text-right text-[11px]">
                  <div className="font-medium text-brand-300">
                    {items.length} on path
                  </div>
                </div>
              </header>

              <div className="flex flex-col gap-2.5">
                {items
                  .slice()
                  .sort((a, b) => {
                    const sa = DEMO_SESSIONS[a.session_id]?.start ?? "";
                    const sb = DEMO_SESSIONS[b.session_id]?.start ?? "";
                    return sa.localeCompare(sb);
                  })
                  .map((ps) => {
                    const session = DEMO_SESSIONS[ps.session_id];
                    if (!session) return null;
                    return (
                      <DemoSessionCard
                        key={ps.session_id}
                        session={session}
                        pathInfo={ps}
                        pending={pending}
                        onMark={handleMark}
                      />
                    );
                  })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-neutral-600">
        Demo only · tap any session to see live reroute · no LLM calls
      </p>
    </section>
  );
}

function opColor(op: "added" | "removed" | "reordered"): string {
  if (op === "added") return "text-emerald-300";
  if (op === "removed") return "text-rose-300";
  return "text-amber-300";
}
