"use client";

import { useEffect, useRef, useState } from "react";

import { BuilderForm } from "@/components/builder-form";
import { Timeline } from "@/components/timeline";
import { fetchBuilderMe, fetchPath } from "@/lib/api-client";
import { useBuilderGps } from "@/lib/store";

export function BuilderApp() {
  const view = useBuilderGps((s) => s.view);
  const hydratePath = useBuilderGps((s) => s.hydratePath);
  const [hydrating, setHydrating] = useState(true);
  // Guard against double-run in React 18 strict mode dev — we don't want
  // /builder/me firing twice on mount.
  const hydratedOnceRef = useRef(false);

  useEffect(() => {
    if (hydratedOnceRef.current) return;
    hydratedOnceRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchBuilderMe();
        if (cancelled) return;
        if (me.has_path) {
          const path = await fetchPath();
          if (cancelled) return;
          hydratePath(path);
        }
      } catch {
        // 404 = no cookie / no session yet. Anything else is a transient
        // network blip we don't want to block the form on. Either way:
        // fall through and show the form.
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydratePath]);

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
          Loading your path…
        </div>
      </div>
    );
  }

  return view === "form" ? <BuilderForm /> : <Timeline />;
}
