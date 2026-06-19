"use client";

import { YouTubeEmbed } from "@/components/youtube-embed";

// Hardcoded — the demo video is the Devpost submission video. If we need
// to swap the link post-AABW, change the ID below and redeploy. No env var
// dependency keeps the deploy story simple.
const DEMO_VIDEO_ID = "ScTRlg9ZzVI";

/**
 * Embed slot for the Devpost demo video. Uses the lite YouTube component
 * so the landing page TTI isn't hurt by the YouTube SDK — the iframe only
 * mounts after the user clicks the play overlay.
 */
export function VideoSlot() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-16 sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-brand-300">
          3-minute demo
        </span>
        <span className="text-[11px] text-neutral-600">
          From goal to your full week
        </span>
      </div>

      <YouTubeEmbed
        videoId={DEMO_VIDEO_ID}
        title="Builder GPS — Devpost demo"
      />
    </section>
  );
}
