# Builder GPS

> AI guide through **Agentic AI Build Week** (Jul 8–12, HCMC). Tell us your goal. We plan your 5 days. Live reroute when your week changes.

Submission to the **Builder Experience Award** pre-event warm-up track.

## What it does

Builders fill a 5-field form (goal, stack, experience, team size, hours/day). Two LLM calls then:

1. **Decompose the goal** into 5–8 prerequisite capabilities, ordered foundational → advanced
2. **Compute the path** — pick 6–10 sessions across Day 1–5 to cover those capabilities, with a "why this is for you" reason per pick

The killer feature: when you mark a session **Attended** / **Skipped** / **Blocked**, the path **reroutes live**. The UI shows you exactly what changed and why — *"Removed Stripe session, added Apify Monetize because you'll still need monetization concepts before Friday."*

Plus:

- **Calendar export** — one-shot `.ics` download or live subscription URL. Native 15-min reminders fire from Apple/Google Calendar.

## Quickstart

```bash
# 1. Env — each app has its own .env, co-located
cp apps/api/.env.example apps/api/.env       # paste GROQ_API_KEY here
cp apps/web/.env.example apps/web/.env.local # optional CTA URLs
# Free Groq key (1 min): https://console.groq.com/keys

# 2. Backend
./apps/api/scripts/dev.sh                    # creates venv, uvicorn on :8000

# 3. Frontend (separate shell)
pnpm install
pnpm dev                                     # Next.js on :3000
```

Open <http://localhost:3000>. Landing page first → "Plan with your goal" → form → timeline.

## Routes

| Path | What |
|---|---|
| `/` | Landing page with 3 interactive sample personas (no API needed) |
| `/try` | The actual app — form → timeline → reroute |

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind v4 |
| State | TanStack Query + Zustand |
| Backend | Python 3.11+ + FastAPI + Pydantic v2 |
| LLM | Groq + Llama 3.3 70B (swap to Claude / OpenAI / Gemini in one file) |
| Storage | SQLite (single file) |
| Schedule | 44 sessions seeded — 5 confirmed real workshops + 39 mock |

## Project layout

```
builder-gps/
├── apps/
│   ├── web/         Next.js 15 + TS frontend
│   │   ├── app/
│   │   │   ├── page.tsx           Landing
│   │   │   └── try/page.tsx       The app
│   │   ├── components/
│   │   │   ├── landing/           Landing sections
│   │   │   └── (root)             App components
│   │   └── lib/
│   │       ├── demo-paths/        Inlined sample personas
│   │       └── store.ts           Zustand
│   │   └── .env.example           Frontend NEXT_PUBLIC_* vars
│   └── api/         Python FastAPI backend
│       ├── .env.example           Backend env (GROQ_API_KEY, CORS, ...)
│       └── app/
│           ├── routes/            sessions, builder, path
│           ├── services/          decompose_goal, compute_path, path_diff, ical_export
│           ├── prompts/           Markdown system prompts
│           ├── storage/           SQLite store
│           └── data/sessions.json AABW catalog (real + mock)
├── packages/
│   └── shared/      TypeScript types mirroring Pydantic schemas
└── .env.example     Index pointing to per-app envs (no shared env anymore)
```

## API surface

| Method | Path | Auth | What |
|---|---|---|---|
| GET | `/health` | none | Liveness |
| GET | `/sessions` | none | Full schedule catalog |
| POST | `/builder/state` | sets cookie | Submit goal form → returns initial path |
| GET | `/builder/me` | cookie | Cookie-bound builder_id + has_path |
| GET | `/path` | cookie | Current stored path |
| POST | `/path/regenerate` | cookie | Recompute against current state + history |
| POST | `/sessions/{id}/mark` | cookie | attended / skipped / blocked → triggers reroute |
| GET | `/path/export.ics` | cookie | One-shot iCal download |
| GET | `/path/{builder_id}.ics` | builder_id is bearer | Public subscription URL |

Identity: HttpOnly `builder_gps_id` cookie, UUID auto-minted on first form submit. No login.

## Status

| Phase | Status |
|---|---|
| 01 — Scaffolding & API contract | ✅ |
| 02 — Mock schedule (44 sessions) | ✅ |
| 03 — Backend LLM orchestration | ✅ |
| 04 — Frontend timeline + reroute UI | ✅ |
| 05.5 — iCal export | ✅ |
| 06 — Landing page (voter funnel) | ✅ |
| 05 — Framer Motion animations | ⏳ deferred |
| 07 — Demo video + Devpost submission | ⏳ next |

## License

MIT
