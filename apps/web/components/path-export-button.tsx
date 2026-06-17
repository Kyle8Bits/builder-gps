"use client";

import { useState } from "react";

import { exportPathMarkdown } from "@/lib/api-client";

// Downloads the agent-context .md file. The server sets
// Content-Disposition with the slug-derived filename — we still pass a
// fallback `download` attribute for browsers that don't honor the header.
export function PathExportButton() {
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);

  async function onClick() {
    setBusy(true);
    setErrored(false);
    try {
      const blob = await exportPathMarkdown();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "builder-gps.md";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrored(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="Drop this markdown file into Claude Code, Cursor, or Aider as project context"
      className="cursor-pointer rounded-full border border-brand-700/60 bg-brand-950/40 px-3 py-1.5 text-xs text-brand-200 transition-colors duration-150 hover:border-brand-500 hover:text-brand-100 disabled:cursor-wait disabled:opacity-60"
    >
      {busy
        ? "Downloading…"
        : errored
          ? "Retry export"
          : "Export agent context (.md)"}
    </button>
  );
}
