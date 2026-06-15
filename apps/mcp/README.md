# Builder GPS MCP Server

Chat with your AABW schedule from Claude Desktop, Claude Code, Cursor, or any
other MCP-aware AI tool. No notifications — request/response only.

## What you get

4 tools, all keyed off your `builder_id` UUID:

| Tool | What it does |
|---|---|
| `get_path` | Your full path + prerequisites + readiness % |
| `get_next_session` | The next session you haven't marked yet |
| `mark_session` | attended / skipped / blocked → triggers a reroute |
| `regenerate_path` | Re-runs the planner against your current history |

## 30-second setup

### 1. Get your builder_id

Open the web app → fill the goal form → on the timeline, expand
**"Connect via MCP? Show builder ID"** → copy the UUID.

### 2. Install the server

```bash
cd builder-gps/apps/mcp
pip install -e .
# verify the script lands on your PATH:
builder-gps-mcp --help  # (no-op; just confirms install)
```

The package exposes a `builder-gps-mcp` console script.

### 3. Wire it into your AI tool

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "builder-gps": {
      "command": "builder-gps-mcp",
      "env": {
        "BUILDER_GPS_API_URL": "http://localhost:8000",
        "BUILDER_GPS_BUILDER_ID": "PASTE-YOUR-UUID-HERE"
      }
    }
  }
}
```

Restart Claude Desktop. The compass icon → MCP → you should see `builder-gps`
with 4 tools.

**Claude Code** — one-liner:

```bash
claude mcp add builder-gps \
  --env BUILDER_GPS_API_URL=http://localhost:8000 \
  --env BUILDER_GPS_BUILDER_ID=PASTE-YOUR-UUID-HERE \
  -- builder-gps-mcp
```

**Cursor** — `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "builder-gps": {
      "command": "builder-gps-mcp",
      "env": {
        "BUILDER_GPS_API_URL": "http://localhost:8000",
        "BUILDER_GPS_BUILDER_ID": "PASTE-YOUR-UUID-HERE"
      }
    }
  }
}
```

## Demo conversation

```
You:    What's next on my AABW schedule?
Claude: [calls get_next_session]
        Your next session is "Building production-ready agents with Apify"
        on Day 3 (Jul 10) at 14:00 in Hall B. It's on your path because you
        flagged scraping as a stack item.

You:    I'll skip the morning one — mark it skipped.
Claude: [calls mark_session("d3-morning-deep-dive", "skipped")]
        Marked skipped. Three changes to your path:
          • Added "Agent Eval Frameworks" (you still need eval skills)
          • Removed "LangGraph 101" (dependency on the skipped session)
          • Reordered Day 4 to move "Demo Polish" earlier
        Readiness held at 62%.

You:    Give me a fresh plan based on what I've actually attended.
Claude: [calls regenerate_path]
        ... [new path]
```

## Env vars

| Name | Required | Default | Notes |
|---|---|---|---|
| `BUILDER_GPS_BUILDER_ID` | yes | — | UUID from the web app footer. **This is your auth token — don't share publicly.** |
| `BUILDER_GPS_API_URL` | no | `http://localhost:8000` | Point at your deployed backend in prod |

## Security model

The `builder_id` UUID is a bearer credential — anyone with it can mark sessions
on your behalf. For hackathon scope this is intentional (low-stakes, makes
sharing trivial). Don't paste it into screenshots or public configs.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `BUILDER_GPS_BUILDER_ID env var not set` | Env block not loaded — restart the AI tool after editing config |
| `[400] No builder session` | The UUID is wrong or you haven't submitted the form yet |
| `[404] No path yet` | Backend can't find your record — re-submit the form on the web app |
| Tools missing from Claude Desktop | Check Claude Desktop logs at `~/Library/Logs/Claude/mcp*.log` |
