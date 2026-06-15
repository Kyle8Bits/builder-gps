"use client";

import { useEffect } from "react";

import { useBuilderGps } from "@/lib/store";
import { cn } from "@/lib/cn";

const OP_GLYPH: Record<string, string> = {
  added: "+",
  removed: "−",
  reordered: "↕",
};

const OP_PALETTE: Record<string, string> = {
  added: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  removed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  reordered: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};

const OP_LABEL: Record<string, string> = {
  added: "Added",
  removed: "Removed",
  reordered: "Moved",
};

/**
 * Phase 04 version: static drawer w/ tasteful enter animation
 * via CSS slide-up. Phase 05 swaps in Framer Motion for per-card animations.
 */
export function RerouteNotice() {
  const reroute = useBuilderGps((s) => s.reroute);
  const dismiss = useBuilderGps((s) => s.dismissReroute);

  useEffect(() => {
    if (!reroute) return;
    const t = setTimeout(dismiss, 10000);
    return () => clearTimeout(t);
  }, [reroute, dismiss]);

  if (!reroute) return null;

  const delta = reroute.readinessDelta;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-2xl px-4 pb-4">
      <div
        key={reroute.ts}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-brand-700/60 bg-neutral-900/95 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5),0_0_40px_-12px_rgba(20,184,166,0.25)] backdrop-blur",
          "animate-[slideUp_0.35s_cubic-bezier(0.22,1,0.36,1)]"
        )}
      >
        {/* Top accent strip */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent" />

        <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-200">
            <span className="text-brand-400">🧭</span>
            Path updated · {reroute.diffs.length} change
            {reroute.diffs.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-3">
            {delta !== 0 && (
              <span
                className={cn(
                  "tnum rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  delta > 0
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                )}
              >
                {delta > 0 ? "+" : ""}
                {delta}% ready
              </span>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="cursor-pointer rounded-full border border-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400 transition-colors hover:border-neutral-600 hover:text-neutral-200"
            >
              Got it
            </button>
          </div>
        </div>

        <ul className="flex max-h-[42vh] flex-col gap-2 overflow-y-auto px-4 py-3 text-xs">
          {reroute.diffs.map((d, i) => (
            <li
              key={`${d.op}-${d.session_id}-${i}`}
              className="flex items-start gap-2.5"
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 flex-none items-center justify-center rounded-md border font-mono",
                  OP_PALETTE[d.op]
                )}
                aria-label={OP_LABEL[d.op]}
              >
                {OP_GLYPH[d.op]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    {OP_LABEL[d.op]}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-300">
                    {d.session_id}
                  </span>
                </div>
                <p className="mt-0.5 text-neutral-300/90">{d.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Inline keyframe — keeps the slide-up self-contained */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(24px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
