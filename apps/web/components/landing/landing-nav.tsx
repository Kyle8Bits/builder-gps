"use client";

import Link from "next/link";

import { Logo } from "@/components/logo";

const DEVPOST_URL = process.env.NEXT_PUBLIC_DEVPOST_URL ?? "";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-30 w-full border-b border-neutral-900/80 bg-neutral-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-100"
          aria-label="Builder GPS home"
        >
          <Logo size={22} showWord />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/try"
            className="cursor-pointer rounded-full border border-brand-700/70 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-200 transition-colors duration-150 hover:bg-brand-500/20"
          >
            Try it →
          </Link>
          {DEVPOST_URL ? (
            <a
              href={DEVPOST_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="cursor-pointer rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition-colors duration-150 hover:border-neutral-600 hover:text-neutral-100"
            >
              Vote on Devpost
            </a>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
