import Link from "next/link";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-12 pt-16 text-center sm:pt-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-brand-700/40 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
        AABW · Jul 8–12 · HCMC
      </span>

      <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-neutral-50 sm:text-6xl">
        Your AI guide through{" "}
        <span className="bg-gradient-to-br from-brand-300 via-brand-400 to-cyan-400 bg-clip-text text-transparent">
          Agentic AI Build Week
        </span>
      </h1>

      <p className="max-w-xl text-pretty text-base text-neutral-400 sm:text-lg">
        Tell us what you want to ship. We plan your 5 days —{" "}
        <span className="text-neutral-200">
          the workshops, the prereqs, the demo polish
        </span>{" "}
        — and reroute live when your week changes.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/try"
          className="group inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-[0_0_24px_-6px_rgba(20,184,166,0.55)] transition-all duration-150 hover:bg-brand-400"
        >
          Plan with your goal
          <span className="transition-transform duration-150 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
        <a
          href="#demo"
          className="cursor-pointer rounded-full border border-neutral-800 px-5 py-3 text-sm text-neutral-300 transition-colors duration-150 hover:border-neutral-600 hover:text-neutral-100"
        >
          See a sample path
        </a>
      </div>

      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600">
        No login · 5 fields · 30 seconds
      </p>
    </section>
  );
}
