"use client";

import { useState } from "react";

import { SessionCard } from "@/components/session-card";
import { DAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { PathSession, Session } from "@shared/types";

interface DayBlockProps {
  day: 1 | 2 | 3 | 4 | 5;
  sessions: Session[];
  pathLookup: Map<string, PathSession>;
}

// Subtle day-specific accent gradient on the sticky header.
const DAY_TINT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "from-brand-400/15 to-transparent",
  2: "from-sky-400/12 to-transparent",
  3: "from-violet-400/12 to-transparent",
  4: "from-amber-400/15 to-transparent",
  5: "from-rose-400/15 to-transparent",
};

export function DayBlock({ day, sessions, pathLookup }: DayBlockProps) {
  const [showAll, setShowAll] = useState(false);
  const meta = DAY_LABELS[day];

  const recommended = sessions.filter((s) => pathLookup.has(s.id));
  const others = sessions.filter((s) => !pathLookup.has(s.id));

  const sortByTime = (a: Session, b: Session) =>
    a.start.localeCompare(b.start);

  return (
    <section className="flex flex-col gap-3">
      <header
        className={cn(
          "sticky top-0 z-10 -mx-1 flex items-end justify-between gap-3 rounded-lg border border-neutral-800/60 px-3 py-2.5 backdrop-blur",
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
            {recommended.length} on path
          </div>
          <div className="text-neutral-600">{others.length} others</div>
        </div>
      </header>

      <div className="flex flex-col gap-2.5">
        {recommended.sort(sortByTime).map((s) => (
          <SessionCard key={s.id} session={s} pathInfo={pathLookup.get(s.id)} />
        ))}

        {recommended.length === 0 && (
          <div className="rounded-lg border border-dashed border-neutral-800 px-3 py-4 text-center text-xs text-neutral-600">
            Nothing on your path this day.
          </div>
        )}
      </div>

      {others.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className={cn(
            "self-start cursor-pointer rounded-full border border-neutral-800 px-3 py-1 text-[11px] text-neutral-500 transition-colors duration-150",
            "hover:border-neutral-600 hover:text-neutral-300"
          )}
        >
          {showAll ? "Hide" : "Show"} {others.length} non-recommended
        </button>
      )}

      {showAll && (
        <div className="flex flex-col gap-2 pl-1">
          {others.sort(sortByTime).map((s) => (
            <SessionCard key={s.id} session={s} pathInfo={undefined} />
          ))}
        </div>
      )}
    </section>
  );
}
