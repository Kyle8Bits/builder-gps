"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markSession } from "@/lib/api-client";
import { useBuilderGps } from "@/lib/store";
import { cn } from "@/lib/cn";
import type { MarkStatus, PathSession, Session } from "@shared/types";

interface SessionCardProps {
  session: Session;
  pathInfo: PathSession | undefined;
}

const STATUS_CLASS: Record<string, string> = {
  recommended:
    "border-brand-700/70 bg-gradient-to-br from-brand-950/60 via-neutral-950/70 to-neutral-950 shadow-[inset_0_1px_0_rgba(45,212,191,0.08)]",
  attended:
    "border-emerald-700/60 bg-emerald-950/30 opacity-80",
  skipped:
    "border-neutral-800 bg-neutral-950/40 opacity-50",
  blocked:
    "border-amber-700/60 bg-amber-950/30",
  ghost:
    "border-neutral-900 bg-neutral-950/30 opacity-50",
};

const STATUS_ACCENT: Record<string, string> = {
  recommended: "bg-brand-400",
  attended: "bg-emerald-400",
  skipped: "bg-neutral-600",
  blocked: "bg-amber-400",
};

export function SessionCard({ session, pathInfo }: SessionCardProps) {
  const status = pathInfo?.status ?? "ghost";
  const recommended = pathInfo !== undefined;
  const setPath = useBuilderGps((s) => s.setPath);
  const prevReadiness = useBuilderGps((s) => s.path?.readiness_pct ?? 0);
  const qc = useQueryClient();

  const mark = useMutation({
    mutationFn: (next: MarkStatus) => markSession(session.id, next),
    onSuccess: (data) => {
      setPath(data, prevReadiness);
      qc.invalidateQueries({ queryKey: ["path"] });
    },
  });

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-colors duration-200",
        STATUS_CLASS[status],
        recommended && "hover:border-brand-500"
      )}
    >
      {/* Status accent strip */}
      {recommended && (
        <span
          className={cn(
            "absolute left-0 top-0 h-full w-0.5 rounded-l",
            STATUS_ACCENT[status]
          )}
        />
      )}

      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5 text-xs">
          <span className="font-mono tnum font-medium text-neutral-200">
            {session.start}
          </span>
          <span className="text-neutral-700">→</span>
          <span className="font-mono tnum text-neutral-500">
            {session.end}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {session.source === "confirmed" && (
            <span className="rounded-full border border-brand-700/60 bg-brand-950/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-300">
              live
            </span>
          )}
          <span className="text-xs font-medium text-neutral-500">
            {session.partner ?? "AABW"}
          </span>
        </div>
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-snug text-neutral-50">
        {session.title}
      </h3>

      <div className="mt-1 text-[11px] text-neutral-500">
        <span className="text-neutral-600">@</span> {session.venue}
      </div>

      {recommended && pathInfo && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-brand-500/[0.06] px-2.5 py-1.5 text-xs leading-snug text-brand-200/90">
          <span className="mt-0.5 text-brand-400">★</span>
          <span>{pathInfo.reason}</span>
        </p>
      )}

      {!recommended && (
        <div className="mt-2 flex flex-wrap gap-1">
          {session.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-sm bg-neutral-900/60 px-1.5 py-0.5 text-[10px] text-neutral-500"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {recommended && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StatusButton
            status="attended"
            active={status === "attended"}
            onClick={() => mark.mutate("attended")}
            disabled={mark.isPending}
            label="Attended"
          />
          <StatusButton
            status="skipped"
            active={status === "skipped"}
            onClick={() => mark.mutate("skipped")}
            disabled={mark.isPending}
            label="Skipped"
          />
          <StatusButton
            status="blocked"
            active={status === "blocked"}
            onClick={() => mark.mutate("blocked")}
            disabled={mark.isPending}
            label="Blocked"
          />
          {session.signup_url && (
            <a
              href={session.signup_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto cursor-pointer text-[11px] font-medium text-brand-300 underline-offset-4 hover:text-brand-200 hover:underline"
            >
              Sign up ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function StatusButton({
  status,
  active,
  onClick,
  disabled,
  label,
}: {
  status: MarkStatus;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  const palette: Record<string, string> = {
    attended: active
      ? "border-emerald-600 bg-emerald-900/40 text-emerald-200"
      : "border-neutral-800 bg-neutral-950/50 text-neutral-400 hover:border-emerald-700 hover:text-emerald-300",
    skipped: active
      ? "border-neutral-600 bg-neutral-800 text-neutral-200"
      : "border-neutral-800 bg-neutral-950/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200",
    blocked: active
      ? "border-amber-600 bg-amber-900/30 text-amber-200"
      : "border-neutral-800 bg-neutral-950/50 text-neutral-400 hover:border-amber-700 hover:text-amber-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
        palette[status],
        disabled && "cursor-wait opacity-50"
      )}
    >
      {label}
    </button>
  );
}
