"use client";

import type { ResourceLink, ResourceSource } from "@shared/types";

// Small text labels by source — keeps Tailwind purge happy and avoids
// emoji rendering inconsistency across OSes. UX intent: a glance is
// enough to know what type of link this is.
const SOURCE_LABEL: Record<ResourceSource, string> = {
  youtube: "VIDEO",
  docs: "DOCS",
  blog: "BLOG",
  github: "REPO",
  other: "LINK",
};

const SOURCE_COLOR: Record<ResourceSource, string> = {
  youtube: "border-red-900/60 bg-red-950/30 text-red-300",
  docs: "border-brand-900/60 bg-brand-950/30 text-brand-300",
  blog: "border-amber-900/60 bg-amber-950/30 text-amber-300",
  github: "border-neutral-700 bg-neutral-900/60 text-neutral-300",
  other: "border-neutral-800 bg-neutral-950/40 text-neutral-400",
};

export function CapabilityResources({
  resources,
}: {
  resources: ResourceLink[] | undefined;
}) {
  if (!resources || resources.length === 0) {
    return (
      <div className="mt-1.5 text-[10px] italic text-neutral-600">
        No resources found.
      </div>
    );
  }

  return (
    <ul className="mt-1.5 flex flex-col gap-1.5">
      {resources.slice(0, 3).map((r) => (
        <li key={r.url}>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 rounded-md border border-neutral-800/60 bg-neutral-950/40 px-2 py-1.5 text-[11px] text-neutral-300 transition-colors hover:border-brand-700/60 hover:text-brand-100"
          >
            <span
              className={`shrink-0 rounded border px-1 py-[1px] text-[9px] font-semibold uppercase tracking-wider ${
                SOURCE_COLOR[r.source] ?? SOURCE_COLOR.other
              }`}
            >
              {SOURCE_LABEL[r.source] ?? SOURCE_LABEL.other}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-1 font-medium">{r.title}</span>
              <span className="line-clamp-2 text-neutral-500 group-hover:text-neutral-400">
                {r.snippet}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
