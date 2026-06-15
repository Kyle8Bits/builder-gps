"""Build RFC 5545 iCalendar (.ics) text from a builder's path.

No external deps — iCal is verbose but mechanical. Generates a VCALENDAR
with one VEVENT per session on the path, anchored to Asia/Saigon (no DST,
constant +07:00 offset). Each VEVENT carries a 15-minute VALARM so macOS,
iOS, and Android calendars all fire native notifications.

Demo Day is always appended even if not on the recommended path —
nobody should miss it.
"""

from __future__ import annotations

import hashlib
from collections.abc import Iterable

from app.schemas import PathSession, Session

# Static IDs for "always include" anchor events.
DEMO_DAY_ANCHOR_IDS = ("d5-demo-day", "d5-awards-closing")

# AABW year — used to build full ISO datetimes from session times.
AABW_YEAR = 2026
AABW_MONTH = 7
DAY_TO_DATE = {1: 8, 2: 9, 3: 10, 4: 11, 5: 12}  # Jul 8–12, 2026


def build_ics(
    *,
    path_sessions: list[PathSession],
    catalog: Iterable[Session],
    readiness_pct: int,
) -> str:
    """Render the full VCALENDAR string."""
    by_id = {s.id: s for s in catalog}
    path_by_id = {p.session_id: p for p in path_sessions}

    # Path sessions, plus Demo Day anchors if missing.
    event_ids: list[str] = list(path_by_id.keys())
    for anchor in DEMO_DAY_ANCHOR_IDS:
        if anchor not in event_ids and anchor in by_id:
            event_ids.append(anchor)

    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Builder GPS//AABW//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:Builder GPS — AABW Jul 8–12",
        (
            "X-WR-CALDESC:Your personalized AABW path. "
            f"Readiness: {readiness_pct}%."
        ),
        "X-WR-TIMEZONE:Asia/Saigon",
        *_vtimezone_saigon(),
    ]

    for sid in event_ids:
        session = by_id.get(sid)
        if session is None:
            continue
        path_info = path_by_id.get(sid)
        lines.extend(_vevent(session, path_info))

    lines.append("END:VCALENDAR")
    # RFC 5545 mandates CRLF line endings.
    return "\r\n".join(lines) + "\r\n"


def _vtimezone_saigon() -> list[str]:
    """Asia/Saigon has no DST → constant UTC+07:00 — simplest possible block."""
    return [
        "BEGIN:VTIMEZONE",
        "TZID:Asia/Saigon",
        "BEGIN:STANDARD",
        "DTSTART:19700101T000000",
        "TZOFFSETFROM:+0700",
        "TZOFFSETTO:+0700",
        "TZNAME:+07",
        "END:STANDARD",
        "END:VTIMEZONE",
    ]


def _vevent(session: Session, path_info: PathSession | None) -> list[str]:
    """Render a single VEVENT with a 15-min VALARM reminder."""
    start = _datetime(session.day, session.start)
    end = _datetime(session.day, session.end)
    uid = f"{session.id}@builder-gps"
    summary = _escape(session.title)
    description = _build_description(session, path_info)
    location = _escape(session.venue)

    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{_dtstamp()}",
        f"DTSTART;TZID=Asia/Saigon:{start}",
        f"DTEND;TZID=Asia/Saigon:{end}",
        f"SUMMARY:{summary}",
        f"DESCRIPTION:{description}",
        f"LOCATION:{location}",
    ]
    if session.signup_url:
        lines.append(f"URL:{session.signup_url}")
    if session.source == "confirmed":
        lines.append("CATEGORIES:Confirmed AABW Workshop")
    else:
        lines.append("CATEGORIES:Mock Schedule (Builder GPS demo)")

    # 15-min reminder so macOS / iOS / Android notify before each session.
    lines.extend(
        [
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Builder GPS — {summary} starts in 15 min",
            "TRIGGER:-PT15M",
            "END:VALARM",
            "END:VEVENT",
        ]
    )
    return lines


def _build_description(session: Session, path_info: PathSession | None) -> str:
    parts: list[str] = []
    if path_info:
        parts.append(f"★ {path_info.reason}")
        parts.append("")
    parts.append(session.description)
    if session.signup_url:
        parts.append("")
        parts.append(f"Sign up: {session.signup_url}")
    parts.append("")
    parts.append(f"Source: {session.source}")
    parts.append("Built with Builder GPS · AABW pre-event warm-up.")
    return _escape("\n".join(parts))


def _datetime(day: int, hhmm: str) -> str:
    """Compose a local DTSTART/DTEND string (no Z, no offset — TZID covers it).

    Format: YYYYMMDDTHHMMSS.
    """
    date = DAY_TO_DATE[day]
    hour, minute = hhmm.split(":")
    return f"{AABW_YEAR}{AABW_MONTH:02d}{date:02d}T{int(hour):02d}{int(minute):02d}00"


def _dtstamp() -> str:
    """A stable UTC stamp — fine for hackathon; calendars only care it parses.

    Uses a deterministic hash so identical paths produce identical .ics
    (helps calendar apps de-duplicate on subscription refresh).
    """
    # Anchor to a fixed instant: 2026-06-15T00:00:00Z (plan creation date).
    return "20260615T000000Z"


def _escape(text: str) -> str:
    """Escape per RFC 5545: backslash, semicolon, comma, newline."""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
        .replace("\r", "")
    )
