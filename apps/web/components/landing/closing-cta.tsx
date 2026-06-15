import Link from "next/link";

const DEVPOST_URL = process.env.NEXT_PUBLIC_DEVPOST_URL ?? "";

export function ClosingCta() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center sm:px-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-700/40 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
        Submission · Builder Experience Award
      </div>
      <h2 className="text-balance text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
        Built for AABW. Built for builders.
      </h2>
      <p className="max-w-xl text-pretty text-sm text-neutral-400">
        Try it with your own goal — 30 seconds, no login. If it's useful to you,
        a Devpost vote helps us actually ship it during the event.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/try"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_0_24px_-6px_rgba(20,184,166,0.55)] transition-all duration-150 hover:bg-brand-400"
        >
          Plan with your goal →
        </Link>
        {DEVPOST_URL ? (
          <a
            href={DEVPOST_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="cursor-pointer rounded-full border border-neutral-700 px-5 py-3 text-sm font-medium text-neutral-200 transition-colors duration-150 hover:border-neutral-500"
          >
            Vote on Devpost ↗
          </a>
        ) : null}
      </div>
    </section>
  );
}
