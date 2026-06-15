"use client";

import { BuilderForm } from "@/components/builder-form";
import { Timeline } from "@/components/timeline";
import { useBuilderGps } from "@/lib/store";

export function BuilderApp() {
  const view = useBuilderGps((s) => s.view);
  return view === "form" ? <BuilderForm /> : <Timeline />;
}
