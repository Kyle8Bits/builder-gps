import type { Persona } from "./types";

export const voiceBot: Persona = {
  id: "voice-bot",
  label: "Voice agent",
  goal: "Ship a voice agent that books appointments by Friday",
  stack: ["python", "anthropic", "twilio"],
  experience: "beginner",
  initial: {
    prerequisites: {
      capabilities: [
        {
          name: "Realtime voice transport",
          why: "Booking happens in conversation — you need low-latency audio.",
          matching_tags: ["openai", "voice", "agents"],
        },
        {
          name: "Tool use for calendar booking",
          why: "The agent has to actually write to a calendar, not just talk.",
          matching_tags: ["anthropic", "tool-use", "agents"],
        },
        {
          name: "Eval for voice happy-paths",
          why: "Voice misinterpretations are silent killers on stage.",
          matching_tags: ["openai", "eval", "agents"],
        },
        {
          name: "Demo Day polish",
          why: "Voice demos live or die on the recording setup.",
          matching_tags: ["aabw", "pitch", "demo"],
        },
      ],
      success_criteria: [
        "End-to-end demo: voice → booked appointment → confirmation",
        "Handles 'I want a different time' branch without failing",
        "Pre-recorded clean audio backup ready by Thursday night",
      ],
    },
    sessions: [
      {
        session_id: "d1-anthropic-claude-intro",
        reason: "Tool-call basics — your booking primitive starts here.",
        status: "recommended",
      },
      {
        session_id: "d2-openai-realtime",
        reason: "Core voice transport. 90-min hands-on, beginner-friendly.",
        status: "recommended",
      },
      {
        session_id: "d2-anthropic-tooluse",
        reason: "Reliable function calls for the booking step.",
        status: "recommended",
      },
      {
        session_id: "d3-anthropic-evals",
        reason: "Catch voice misinterpretations before judges do.",
        status: "recommended",
      },
      {
        session_id: "d4-clinic-tooluse",
        reason: "Live debug your booking-tool edge cases.",
        status: "recommended",
      },
      {
        session_id: "d4-pitch-coaching",
        reason: "Frame the demo — voice agents need a tight script.",
        status: "recommended",
      },
      {
        session_id: "d5-demo-day",
        reason: "Ship it.",
        status: "recommended",
      },
    ],
    readiness_pct: 55,
    last_change: null,
  },
  altPaths: {
    // Visitor marks the OpenAI Realtime session as attended.
    "d2-openai-realtime:attended": {
      prerequisites: {} as never,
      sessions: [
        {
          session_id: "d1-anthropic-claude-intro",
          reason: "Tool-call basics — your booking primitive starts here.",
          status: "recommended",
        },
        {
          session_id: "d2-openai-realtime",
          reason: "Attended ✓ — voice transport is solved.",
          status: "attended",
        },
        {
          session_id: "d2-anthropic-tooluse",
          reason: "Reliable function calls for the booking step.",
          status: "recommended",
        },
        {
          session_id: "d3-anthropic-evals",
          reason: "Catch voice misinterpretations before judges do.",
          status: "recommended",
        },
        {
          session_id: "d4-clinic-tooluse",
          reason: "Live debug your booking-tool edge cases.",
          status: "recommended",
        },
        {
          session_id: "d4-pitch-coaching",
          reason: "Frame the demo — voice agents need a tight script.",
          status: "recommended",
        },
        {
          session_id: "d5-demo-day",
          reason: "Ship it.",
          status: "recommended",
        },
      ],
      readiness_pct: 66,
      last_change: [],
    },
    // Visitor skips the OpenAI Realtime session — fallback to text-driven prep.
    "d2-openai-realtime:skipped": {
      prerequisites: {} as never,
      sessions: [
        {
          session_id: "d1-anthropic-claude-intro",
          reason: "Tool-call basics — your booking primitive starts here.",
          status: "recommended",
        },
        {
          session_id: "d2-openai-realtime",
          reason: "Skipped — you're learning Realtime API solo.",
          status: "skipped",
        },
        {
          session_id: "d2-anthropic-tooluse",
          reason: "Reliable function calls for the booking step.",
          status: "recommended",
        },
        {
          session_id: "d3-google-beyond-autocomplete",
          reason:
            "Added: agentic UX patterns for voice. Closest stand-in.",
          status: "recommended",
        },
        {
          session_id: "d3-anthropic-evals",
          reason: "Catch voice misinterpretations before judges do.",
          status: "recommended",
        },
        {
          session_id: "d4-clinic-tooluse",
          reason: "Live debug your booking-tool edge cases.",
          status: "recommended",
        },
        {
          session_id: "d4-pitch-coaching",
          reason: "Frame the demo — voice agents need a tight script.",
          status: "recommended",
        },
        {
          session_id: "d5-demo-day",
          reason: "Ship it.",
          status: "recommended",
        },
      ],
      readiness_pct: 42,
      last_change: [
        {
          op: "removed",
          session_id: "d2-openai-realtime",
          reason: "You marked this skipped.",
        },
        {
          op: "added",
          session_id: "d3-google-beyond-autocomplete",
          reason:
            "Compensates with agentic UX patterns — won't fully replace voice transport.",
        },
      ],
    },
  },
};
