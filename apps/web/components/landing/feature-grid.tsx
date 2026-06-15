const FEATURES = [
  {
    title: "Goal-driven path-finding",
    body: "Tell us what you want to ship. We decompose it into capabilities and pick the workshops that get you there.",
    glyph: "◎",
  },
  {
    title: "Live reroute when you mark sessions",
    body: "Skipped a workshop? Marked one attended? The path shifts in real time — with explanations for every change.",
    glyph: "↻",
  },
  {
    title: "Calendar + MCP, your way",
    body: "Export to .ics for Apple/Google Calendar with native reminders. Or wire it into Claude Desktop via MCP and ask it from any editor.",
    glyph: "⌘",
  },
  {
    title: "Personalized to your stack",
    body: "5 fields, 30 seconds. Your stack and experience level shape the picks — not a generic 'top 10 talks' list.",
    glyph: "✦",
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] uppercase tracking-[0.18em] text-brand-300">
          Why Builder GPS
        </span>
        <h2 className="text-pretty text-2xl font-bold leading-tight text-neutral-100 sm:text-3xl">
          A schedule isn't a plan.
        </h2>
        <p className="max-w-xl text-pretty text-sm text-neutral-400">
          The AABW agenda has 40+ workshops. Picking the right 6–10 against
          your goal is the hard part. We do that — and we redo it the moment
          your week changes.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="group flex gap-4 rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5 transition-colors duration-150 hover:border-brand-700/60"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-700/40 bg-brand-500/10 text-lg text-brand-300">
              {f.glyph}
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-semibold text-neutral-100">
                {f.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-neutral-400">
                {f.body}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
