"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Reading your goal…",
  "Decomposing into prerequisites…",
  "Matching capabilities to AABW sessions…",
  "Optimizing your 5-day path…",
  "Wrapping up…",
];

/**
 * Inline loading screen shown while the two LLM calls run.
 * Cycles through stages every ~1.4s so the user has something
 * to watch during the ~2-4s round trip.
 */
export function PathLoading() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8 pt-16">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10">
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30" />
          <span className="absolute inset-2 rounded-full bg-brand-500/60" />
        </div>
        <div>
          <div className="text-sm font-medium text-neutral-200">
            {STAGES[stage]}
          </div>
          <div className="text-xs text-neutral-500">
            Two LLM calls. Usually 2–4 seconds.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {[1, 2, 3, 4, 5].map((day) => (
          <div
            key={day}
            className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/30 px-4 py-3 animate-shimmer"
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-700">
                Day {day}
              </div>
              <div className="h-1.5 w-12 rounded-full bg-neutral-800" />
            </div>
            <div className="mt-2 h-3 w-3/4 rounded bg-neutral-800/70" />
            <div className="mt-1.5 h-2 w-1/2 rounded bg-neutral-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
