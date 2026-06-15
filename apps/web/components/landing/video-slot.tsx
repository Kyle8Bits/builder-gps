"use client";

const VIDEO_URL = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? "";

/**
 * Embed slot for the 60-90 sec demo video. Falls back to a placeholder card
 * while Phase 07 produces the actual footage — keeps the landing layout
 * stable + signals "video coming" instead of hiding the section.
 */
export function VideoSlot() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-16 sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-brand-300">
          90-second demo
        </span>
        <span className="text-[11px] text-neutral-600">
          The reroute moment
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/60">
        {VIDEO_URL ? (
          <iframe
            src={VIDEO_URL}
            title="Builder GPS demo"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <VideoPlaceholder />
        )}
      </div>
    </section>
  );
}

function VideoPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(20,184,166,0.18),transparent_70%)]"
      />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-brand-700/40 bg-brand-500/10 text-2xl text-brand-300">
        ▶
      </div>
      <div className="relative text-sm font-semibold text-neutral-200">
        Demo video shipping with submission
      </div>
      <div className="relative max-w-xs text-[11px] text-neutral-500">
        Goal → path → mark a session → live reroute → calendar export. 90 sec.
      </div>
    </div>
  );
}
