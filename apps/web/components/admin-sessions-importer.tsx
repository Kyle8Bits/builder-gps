"use client";

import { useEffect, useState } from "react";

import {
  clearAdminSessions,
  fetchAdminSessions,
  importAdminSessions,
} from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { Session } from "@shared/types";

const TOKEN_KEY = "builder-gps:admin-token";

type Status = {
  kind: "idle" | "loading" | "ok" | "error";
  msg?: string;
};

// Organizer-only UI. Hidden from the main app surface. The shared
// ADMIN_TOKEN must be configured on the API for this to work — if not,
// the GET probe returns 503 and we surface that.
export function AdminSessionsImporter() {
  const [token, setToken] = useState("");
  const [savedToken, setSavedToken] = useState(false);
  const [current, setCurrent] = useState<{
    sessions: Session[];
    source: "override" | "file";
    count: number;
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Restore the token across reloads so an organizer mid-edit doesn't
  // lose their place if they hit refresh.
  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) {
      setToken(t);
      setSavedToken(true);
    }
  }, []);

  async function probe() {
    if (!token.trim()) return;
    setStatus({ kind: "loading", msg: "Checking token + loading catalog..." });
    try {
      const res = await fetchAdminSessions(token.trim());
      setCurrent(res);
      sessionStorage.setItem(TOKEN_KEY, token.trim());
      setSavedToken(true);
      setStatus({
        kind: "ok",
        msg: `Loaded ${res.count} sessions (source: ${res.source}).`,
      });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Probe failed.",
      });
    }
  }

  async function doImport() {
    if (!token.trim()) {
      setStatus({ kind: "error", msg: "Token required." });
      return;
    }
    let parsed: Session[];
    try {
      const raw = JSON.parse(draft);
      if (!Array.isArray(raw)) throw new Error("JSON must be an array.");
      parsed = raw as Session[];
    } catch (err) {
      setStatus({
        kind: "error",
        msg:
          "Invalid JSON: " +
          (err instanceof Error ? err.message : "parse error"),
      });
      return;
    }
    if (parsed.length === 0) {
      setStatus({ kind: "error", msg: "Empty array rejected." });
      return;
    }

    setStatus({
      kind: "loading",
      msg: `Importing ${parsed.length} sessions...`,
    });
    try {
      const res = await importAdminSessions(token.trim(), parsed);
      setStatus({
        kind: "ok",
        msg: `Imported ${res.imported} sessions. The live catalog is now active. (Re-run bootstrap-embeddings.py on the server to refresh shortlist embeddings.)`,
      });
      setDraft("");
      // Re-probe so the table updates.
      const fresh = await fetchAdminSessions(token.trim());
      setCurrent(fresh);
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Import failed.",
      });
    }
  }

  async function doClear() {
    if (!token.trim()) return;
    if (
      !window.confirm(
        "Wipe the override catalog and fall back to the bundled mock JSON?"
      )
    ) {
      return;
    }
    setStatus({ kind: "loading", msg: "Wiping override..." });
    try {
      await clearAdminSessions(token.trim());
      const fresh = await fetchAdminSessions(token.trim());
      setCurrent(fresh);
      setStatus({
        kind: "ok",
        msg: "Override wiped. Falling back to mock JSON.",
      });
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Clear failed.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Admin token
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the ADMIN_TOKEN from the API env"
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={probe}
            className="cursor-pointer rounded-lg border border-brand-700/60 bg-brand-950/40 px-4 py-2 text-xs text-brand-200 transition-colors hover:border-brand-500"
          >
            {savedToken ? "Re-check" : "Check"}
          </button>
        </div>
      </section>

      {current && (
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium text-neutral-200">
              Current catalog
            </h3>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              source: <span className="text-brand-300">{current.source}</span>{" "}
              · {current.count} sessions
            </span>
          </div>
          <div className="max-h-48 overflow-auto rounded border border-neutral-800/60">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-neutral-950">
                <tr className="text-left text-neutral-500">
                  <th className="px-2 py-1">Day</th>
                  <th className="px-2 py-1">Title</th>
                  <th className="px-2 py-1">Partner</th>
                </tr>
              </thead>
              <tbody>
                {current.sessions.slice(0, 50).map((s) => (
                  <tr key={s.id} className="border-t border-neutral-800/60">
                    <td className="px-2 py-1 text-neutral-400">{s.day}</td>
                    <td className="px-2 py-1 text-neutral-200">{s.title}</td>
                    <td className="px-2 py-1 text-neutral-500">
                      {s.partner ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {current.source === "override" && (
            <button
              type="button"
              onClick={doClear}
              className="mt-3 cursor-pointer rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 transition-colors hover:border-red-700"
            >
              Wipe override (fall back to mock JSON)
            </button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          New catalog — paste JSON array
        </label>
        <p className="text-xs text-neutral-500">
          Must be a JSON array of <code>Session</code> objects (matches{" "}
          <code>apps/api/app/schemas.py:Session</code>). Pydantic validates
          server-side; bad rows are flagged with their index.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={14}
          spellCheck={false}
          placeholder='[\n  {\n    "id": "d1-anthropic-claude-intro",\n    "day": 1,\n    "start": "10:00",\n    "end": "12:00",\n    "venue": "Main Hall",\n    "partner": "Anthropic",\n    "title": "Building Agents with Claude",\n    "description": "...",\n    "tags": ["anthropic", "agents"],\n    "level": "intro",\n    "source": "confirmed",\n    "signup_url": null\n  }\n]'
          className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 font-mono text-xs text-neutral-100 placeholder:text-neutral-700 focus:border-brand-500 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={doImport}
            disabled={!draft.trim() || !token.trim()}
            className="cursor-pointer rounded-lg border border-brand-400/60 bg-brand-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Replace catalog
          </button>
          <span className="text-[11px] text-neutral-600">
            This atomically wipes + inserts. No undo.
          </span>
        </div>
      </section>

      {status.kind !== "idle" && status.msg && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            status.kind === "ok" &&
              "border-emerald-900/60 bg-emerald-950/30 text-emerald-300",
            status.kind === "error" &&
              "border-red-900/60 bg-red-950/30 text-red-300",
            status.kind === "loading" &&
              "border-neutral-800 bg-neutral-950/60 text-neutral-300"
          )}
        >
          {status.msg}
        </div>
      )}
    </div>
  );
}
