import Link from "next/link";

import { Logo } from "@/components/logo";

const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? "";

export function LandingFooter() {
  return (
    <footer className="border-t border-neutral-900/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1.5">
          <Logo size={22} showWord />
          <p className="text-[11px] text-neutral-600">
            Submission to the Builder Experience Award · Agentic AI Build Week
            · Jul 8–12, HCMC
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <Link href="/try" className="hover:text-neutral-200">
            Try it
          </Link>
          {GITHUB_URL ? (
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-neutral-200"
            >
              GitHub ↗
            </a>
          ) : null}
          <span className="text-neutral-700">v0.1</span>
        </div>
      </div>
    </footer>
  );
}
