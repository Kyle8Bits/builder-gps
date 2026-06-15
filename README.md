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
- **MCP server** — chat with your path from Claude Desktop / Claude Code / Cursor. 4 tools: `get_path`, `get_next_session`, `mark_session`, `regenerate_path`.

## Quickstart

```bash
# 1. Env — single root .env, both apps read from it
cp .env.example .env                         # then paste GROQ_API_KEY
# Free Groq key (1 min): https://console.groq.com/keys

# 2. Backend
./apps/api/scripts/dev.sh                    # creates venv, uvicorn on :8000

# 3. Frontend (separate shell)
pnpm install
pnpm dev                                     # Next.js on :3000

# 4. MCP server (optional)
cd apps/mcp && pip install -e .              # builder-gps-mcp lands on PATH
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
| MCP | Official `mcp` Python SDK, stdio transport |
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
│   ├── api/         Python FastAPI backend
│   │   └── app/
│   │       ├── routes/            sessions, builder, path
│   │       ├── services/          decompose_goal, compute_path, path_diff, ical_export
│   │       ├── prompts/           Markdown system prompts
│   │       ├── storage/           SQLite store
│   │       └── data/sessions.json AABW catalog (real + mock)
│   └── mcp/         Builder GPS MCP server (Python)
│       └── builder_gps_mcp/
│           ├── server.py          FastMCP entrypoint + 4 tools
│           └── api_client.py      httpx wrapper, cookie jar auth
├── packages/
│   └── shared/      TypeScript types mirroring Pydantic schemas
└── .env.example     Single root env for both apps
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

## MCP setup

See [apps/mcp/README.md](apps/mcp/README.md) for Claude Desktop / Claude Code / Cursor config snippets.

```jsonc
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "builder-gps": {
      "command": "/abs/path/to/venv/bin/builder-gps-mcp",
      "env": {
        "BUILDER_GPS_API_URL": "http://localhost:8000",
        "BUILDER_GPS_BUILDER_ID": "uuid-from-web-app-footer"
      }
    }
  }
}
```

## Status

| Phase | Status |
|---|---|
| 01 — Scaffolding & API contract | ✅ |
| 02 — Mock schedule (44 sessions) | ✅ |
| 03 — Backend LLM orchestration | ✅ |
| 04 — Frontend timeline + reroute UI | ✅ |
| 05.5 — iCal export + MCP server | ✅ |
| 06 — Landing page (voter funnel) | ✅ |
| 05 — Framer Motion animations | ⏳ deferred |
| 07 — Demo video + Devpost submission | ⏳ next |

## License

MIT
