import { BuilderApp } from "@/components/builder-app";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "Try Builder GPS",
  description: "Tell us your goal — we'll plan your 5 days at AABW.",
};

export default function TryPage() {
  return (
    <Providers>
      <main className="min-h-screen">
        <BuilderApp />
      </main>
    </Providers>
  );
}
