// Builder GPS — shared frontend constants.

export const DAY_LABELS: Record<1 | 2 | 3 | 4 | 5, { date: string; theme: string }> = {
  1: { date: "Tue Jul 8",  theme: "Enable" },
  2: { date: "Wed Jul 9",  theme: "Integrate" },
  3: { date: "Thu Jul 10", theme: "Design" },
  4: { date: "Fri Jul 11", theme: "Build" },
  5: { date: "Sat Jul 12", theme: "Demo" },
};

export const STACK_OPTIONS = [
  "typescript",
  "python",
  "nextjs",
  "fastapi",
  "anthropic",
  "openai",
  "google",
  "byteplus",
  "vercel",
  "mongodb",
  "stripe",
  "cloudflare",
  "langchain",
  "mcp",
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
