import type { Metadata } from "next";

import { AdminSessionsImporter } from "@/components/admin-sessions-importer";
import { Logo } from "@/components/logo";

// Hidden organizer-only page. NOT linked from the main UX — voters won't
// find it during a demo. Marked noindex/nofollow so it doesn't surface in
// search even if someone shares the URL.
export const metadata: Metadata = {
  title: "Builder GPS — Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 pb-24 pt-8 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo size={28} showWord />
        <span className="rounded-full border border-neutral-800 bg-neutral-950/60 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
          Admin
        </span>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-neutral-50">
          Workshop catalog import
        </h1>
        <p className="text-sm leading-relaxed text-neutral-400">
          Paste the live AABW workshop schedule as a JSON array. Replaces the
          bundled mock catalog. The path planner and resource agent will use
          the imported sessions on the next request.
        </p>
      </div>

      <AdminSessionsImporter />

      <footer className="mt-8 border-t border-neutral-800/60 pt-4 text-[11px] text-neutral-600">
        <p>
          This page is hidden from the main builder app. Share the URL only
          with trusted organizers. Token-gated server-side via{" "}
          <code>X-Admin-Token</code>.
        </p>
      </footer>
    </main>
  );
}
