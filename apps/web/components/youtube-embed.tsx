"use client";

import { useState } from "react";

interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  /**
   * Optional caption shown below the player. Useful for "Watch the
   * 3-min demo" / "Submitted to AABW Builder Experience Award" copy.
   */
  caption?: string;
}

/**
 * Lite YouTube embed.
 *
 * First paint = just the thumbnail + play button (no YouTube SDK, no
 * cookies, no third-party network). When the user clicks play we swap
 * in the iframe with `youtube-nocookie.com` so analytics/tracking stays
 * minimal. Trade-off: one extra click to start playback vs. dramatically
 * faster TTI on the landing page.
 */
export function YouTubeEmbed({
  videoId,
  title,
  caption,
}: YouTubeEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  // maxresdefault is YouTube's largest auto-generated thumbnail (1280x720).
  // If unavailable, browsers will silently fall back to a broken-image —
  // worth checking the URL once before deploy.
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-[0_0_40px_rgba(20,184,166,0.15)]">
        {loaded ? (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="group relative h-full w-full cursor-pointer"
            aria-label={`Play video: ${title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 via-black/30 to-black/50 transition-colors group-hover:from-black/30 group-hover:via-black/40 group-hover:to-black/60">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 shadow-[0_0_30px_rgba(20,184,166,0.6)] transition-transform duration-200 group-hover:scale-110 sm:h-20 sm:w-20">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7 translate-x-0.5 text-neutral-950 sm:h-8 sm:w-8"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </button>
        )}
      </div>
      {caption && (
        <p className="text-center text-xs text-neutral-500">{caption}</p>
      )}
    </div>
  );
}
