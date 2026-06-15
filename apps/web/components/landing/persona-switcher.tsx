"use client";

import { cn } from "@/lib/cn";
import { PERSONAS, type Persona } from "@/lib/demo-paths";

interface PersonaSwitcherProps {
  activeId: string;
  onSelect: (persona: Persona) => void;
}

export function PersonaSwitcher({ activeId, onSelect }: PersonaSwitcherProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Try a sample goal
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Sample persona"
      >
        {PERSONAS.map((p) => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(p)}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150",
                active
                  ? "border-brand-500 bg-brand-500/15 text-brand-100"
                  : "border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
