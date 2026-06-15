"use client";

interface ReadinessBarProps {
  pct: number;
  goalLabel: string;
  totalSessions: number;
}

export function ReadinessBar({ pct, goalLabel, totalSessions }: ReadinessBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Your path
          </span>
          <span className="mt-0.5 text-sm font-medium text-neutral-200">
            {goalLabel}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono tnum text-3xl font-bold leading-none text-brand-300">
            {clamped}
            <span className="ml-0.5 text-lg text-brand-500/80">%</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-600">
            Demo Day ready
          </div>
        </div>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full border border-neutral-800/80 bg-neutral-950/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-700 via-brand-400 to-brand-300 transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_var(--p)_50%,rgba(45,212,191,0.35),transparent_60%)] transition-all duration-700"
          style={{ ["--p" as never]: `${clamped}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-neutral-500">
        <span>
          <span className="text-neutral-300">{totalSessions}</span> sessions on
          your path
        </span>
        <span className="text-neutral-600">Friday, Jul 12 →</span>
      </div>
    </div>
  );
}
