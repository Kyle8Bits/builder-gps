"""Markdown "agent context" export (Phase 06).

Builds the kitchen-sink `.md` file that a builder downloads from
`/path/export.md` and pastes into Claude Code / Cursor as project context.

The file leads with an agent-system-prompt header so the receiving LLM is
briefed on what role to play. Then renders goal + capabilities + path +
resources + reasoning trace from the decompose agent and critic.

KISS: pure string assembly, no Jinja, no template files.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from app.schemas import (
    BuilderState,
    Capability,
    PathSession,
    Prerequisites,
    ResourceLink,
    Session,
)

AGENT_HEADER = (
    "> **You are helping a builder ship the project below during "
    "Agentic AI Build Week (Jul 8-12, HCMC).**\n"
    "> Use this file as project context. Reference the capabilities and "
    "resources as needed.\n"
    "> Do not invent capabilities not listed here. When asked what to do "
    "next, look at the 5-day path and the readiness percentage."
)

SOURCE_ICONS = {
    "youtube": "[YouTube]",
    "docs": "[Docs]",
    "blog": "[Blog]",
    "github": "[GitHub]",
    "other": "[Link]",
}

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slug_from_goal(goal: str, max_len: int = 40) -> str:
    """URL-safe filename slug derived from the builder's goal text."""
    s = _SLUG_RE.sub("-", goal.lower()).strip("-")
    return (s or "builder-gps")[:max_len].rstrip("-") or "builder-gps"


def _escape_link_text(text: str) -> str:
    """Tavily titles can have `[` `]` that confuse markdown link parsers."""
    return text.replace("[", "(").replace("]", ")")


def _capability_section(
    cap: Capability, resources: list[ResourceLink]
) -> str:
    lines = [f"### {cap.name}", "", cap.why, ""]
    if cap.matching_tags:
        lines.append(f"**Tags:** {', '.join(cap.matching_tags)}")
        lines.append("")
    lines.append("**Resources:**")
    if not resources:
        lines.append("- _No resources fetched._")
    else:
        for r in resources:
            icon = SOURCE_ICONS.get(r.source, "[Link]")
            title = _escape_link_text(r.title)
            lines.append(f"- {icon} [{title}]({r.url}) — {r.snippet}")
    lines.append("")
    return "\n".join(lines)


def _path_section(
    path: list[PathSession], catalog: list[Session]
) -> str:
    by_id = {s.id: s for s in catalog}
    by_day: dict[int, list[tuple[Session, PathSession]]] = {}
    for ps in path:
        s = by_id.get(ps.session_id)
        if not s:
            continue
        by_day.setdefault(s.day, []).append((s, ps))

    parts: list[str] = []
    for day in sorted(by_day):
        parts.append(f"### Day {day}")
        parts.append("")
        for s, ps in sorted(by_day[day], key=lambda t: t[0].start):
            parts.append(
                f"- **{s.title}** ({s.start}-{s.end}) — {ps.reason}"
            )
        parts.append("")
    return "\n".join(parts) if parts else "_Path empty._\n"


def _trace_record_summary(rec: dict) -> str:
    """Render one trace record. Tolerates Phase 03 + Phase 04 shapes."""
    # Phase 04 critic record
    if rec.get("phase") == "critic":
        v = rec.get("verdict") or {}
        readiness = rec.get("readiness_pct", "n/a")
        line = (
            f"- **Critic attempt {rec.get('attempt')}** — verdict: "
            f"`{v.get('verdict', 'n/a')}` (readiness {readiness}%)"
        )
        constraint = (v or {}).get("suggested_constraint") or ""
        if constraint:
            line += f"\n  - constraint: _{constraint[:200]}_"
        return line

    # Phase 03 decompose-agent record
    it = rec.get("iteration", "?")
    finish = rec.get("finish") or rec.get("stop") or "?"
    calls = rec.get("tool_calls") or []
    summaries: list[str] = []
    for c in calls:
        name = c.get("name", "?")
        inp = c.get("input") or {}
        detail = inp.get("query") or inp.get("capability_name") or ""
        summaries.append(f"{name}({detail})"[:80])
    summary = ", ".join(summaries) or "—"
    return f"- **Iter {it}** finish=`{finish}` · tools: {summary}"


def _trace_section(trace: list[dict] | None) -> str:
    if not trace:
        return "_No reasoning trace recorded._\n"
    lines: list[str] = []
    for rec in trace:
        try:
            lines.append(_trace_record_summary(rec))
        except Exception:  # noqa: BLE001 — skip bad rows, never fail export
            continue
    return "\n".join(lines) + "\n"


def build_markdown(
    *,
    state: BuilderState,
    prereqs: Prerequisites,
    path: list[PathSession],
    readiness_pct: int,
    resources: dict[str, list[ResourceLink]],
    trace: list[dict] | None,
    catalog: list[Session],
) -> str:
    """Compose the full markdown agent-context file."""
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")

    cap_sections = "\n".join(
        _capability_section(c, resources.get(c.slug, []))
        for c in prereqs.capabilities
    )

    success_block = (
        "\n".join(f"- {c}" for c in prereqs.success_criteria)
        if prereqs.success_criteria
        else "_None specified._"
    )

    parts = [
        "---",
        "# Builder GPS — Agent Context",
        f"# Generated: {now_iso}",
        f"# Goal: {state.goal}",
        "---",
        "",
        AGENT_HEADER,
        "",
        "## The goal",
        "",
        state.goal,
        "",
        "## Stack + experience",
        "",
        f"- Stack: {', '.join(state.stack) or 'unspecified'}",
        f"- Experience: {state.experience}",
        f"- Team size: {state.team_size} | Hours/day: {state.hours_per_day}",
        "",
        f"## Prerequisite capabilities ({len(prereqs.capabilities)})",
        "",
        cap_sections,
        f"## The 5-day path ({len(path)} sessions)",
        "",
        _path_section(path, catalog),
        f"## Readiness: {readiness_pct}%",
        "",
        "## Success criteria",
        "",
        success_block,
        "",
        "## Reasoning trace",
        "",
        _trace_section(trace),
    ]
    return "\n".join(parts).rstrip() + "\n"
