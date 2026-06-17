// Builder GPS — shared frontend constants.

export const DAY_LABELS: Record<1 | 2 | 3 | 4 | 5, { date: string; theme: string }> = {
  1: { date: "Tue Jul 8",  theme: "Enable" },
  2: { date: "Wed Jul 9",  theme: "Integrate" },
  3: { date: "Thu Jul 10", theme: "Design" },
  4: { date: "Fri Jul 11", theme: "Build" },
  5: { date: "Sat Jul 12", theme: "Demo" },
};

// Popular stacks shown as autocomplete suggestions in the combobox.
// Builders can also type any stack we don't list — the form accepts free
// text via stack-combobox.tsx. Order matters: first 8 are shown when the
// input is empty, so put the highest-signal stacks first.
export const STACK_OPTIONS = [
  // languages + first-party frameworks
  "typescript",
  "python",
  "go",
  "rust",
  "nextjs",
  "react",
  "svelte",
  "vue",
  // backend frameworks
  "fastapi",
  "express",
  "hono",
  "trpc",
  // LLM providers
  "anthropic",
  "openai",
  "groq",
  "cerebras",
  "google",
  "cohere",
  "mistral",
  "byteplus",
  // agent frameworks
  "langchain",
  "langgraph",
  "llamaindex",
  "mastra",
  "mcp",
  // databases + storage
  "postgres",
  "mongodb",
  "sqlite",
  "convex",
  "supabase",
  "redis",
  // deploy
  "vercel",
  "railway",
  "cloudflare",
  "fly-io",
  "modal",
  // payments + integrations
  "stripe",
  "tavily",
  "voyage",
  // mobile
  "react-native",
  "flutter",
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "beginner",     label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced",     label: "Advanced" },
] as const;

export const TEAM_OPTIONS = [
  { value: "solo",  label: "Solo" },
  { value: "small", label: "Team of 2–3" },
  { value: "large", label: "Team of 4+" },
] as const;
