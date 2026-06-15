import type { Metadata } from "next";

import { ClosingCta } from "@/components/landing/closing-cta";
import { DemoTimeline } from "@/components/landing/demo-timeline";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { VideoSlot } from "@/components/landing/video-slot";

export const metadata: Metadata = {
  title: "Builder GPS — AI guide through Agentic AI Build Week",
  description:
    "Tell us what you want to ship. We plan your 5 days at AABW — workshops, prereqs, demo polish — and reroute live when your week changes.",
};

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <DemoTimeline />
        <FeatureGrid />
        <VideoSlot />
        <ClosingCta />
      </main>
      <LandingFooter />
    </>
  );
}
