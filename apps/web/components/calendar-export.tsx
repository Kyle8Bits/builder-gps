"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { McpConnectModal } from "@/components/mcp-connect-modal";
import {
  API_URL,
  exportIcsUrl,
  fetchBuilderMe,
  subscriptionIcsUrl,
} from "@/lib/api-client";
import { cn } from "@/lib/cn";

/**
 * Lets the builder take their path off the web app:
 *  - one-shot download (.ics into Calendar)
 *  - subscribe URL (live updates)
 *  - reveals builder_id for the MCP config
 */
export function CalendarExportPanel() {
  const meQuery = useQuery({
    queryKey: ["builder-me"],
    queryFn: fetchBuilderMe,
    staleTime: 60_000,
  });
  const [copied, setCopied] = useState<"sub" | null>(null);
  const [mcpOpen, setMcpOpen] = useState(false);

  const builderId = meQuery.data?.builder_id;
  const subUrl = builderId ? subscriptionIcsUrl(builderId) : "";

  async function copy(text: string, kind: "sub") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200">
            Take it with you
          </h2>
          <p className="text-[11px] text-neutral-500">
            Add your path to Calendar — native 15-min reminders before every
            session.
          </p>
        </div>
        <CalendarGlyph />
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a
          href={exportIcsUrl()}
          download
          className={cn(
            "group flex flex-col gap-0.5 rounded-lg border border-brand-700/60 bg-brand-500/10 px-3 py-2.5 transition-colors duration-150",
            "hover:bg-brand-500/15"
          )}
        >
          <div className="text-xs font-semibold text-brand-200">
            Download .ics ↓
          </div>
          <div className="text-[11px] text-brand-300/70">
            Snapshot of your current path
          </div>
        </a>

        <button
          type="button"
          onClick={() => subUrl && copy(subUrl, "sub")}
          disabled={!subUrl}
          className={cn(
            "group flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-left transition-colors duration-150",
            "hover:border-neutral-600",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <div className="text-xs font-semibold text-neutral-200">
            {copied === "sub" ? "Copied ✓" : "Copy subscribe URL"}
          </div>
          <div className="text-[11px] text-neutral-500">
            Live updates · reroutes sync within ~1h
          </div>
        </button>
      </div>

      <button
        type="button"
        onClick={() => builderId && setMcpOpen(true)}
        disabled={!builderId}
        className={cn(
          "group flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950/60 px-3 py-2.5 text-left transition-colors duration-150",
          "hover:border-brand-700/60 hover:bg-brand-500/[0.06]",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-700/40 bg-brand-500/10 text-xs text-brand-300">
            ⌘
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-neutral-200">
              Connect to your AI editor
            </span>
            <span className="text-[11px] text-neutral-500">
              Claude Desktop · Claude Code · Cursor
            </span>
          </div>
        </div>
        <span className="text-neutral-500 transition-transform duration-150 group-hover:translate-x-0.5">
          →
        </span>
      </button>

      <McpConnectModal
        open={mcpOpen}
        onClose={() => setMcpOpen(false)}
        builderId={builderId ?? ""}
        apiUrl={API_URL}
      />
    </section>
  );
}

function CalendarGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-brand-400"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="3" x2="8" y2="6" />
      <line x1="16" y1="3" x2="16" y2="6" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}
