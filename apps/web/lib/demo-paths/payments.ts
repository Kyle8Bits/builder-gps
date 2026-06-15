import type { Persona } from "./types";

export const payments: Persona = {
  id: "payments",
  label: "Payments agent",
  goal: "Ship a payment-enabled agent demo by Friday",
  stack: ["next.js", "anthropic", "stripe"],
  experience: "intermediate",
  initial: {
    prerequisites: {
      capabilities: [
        {
          name: "Claude tool-use + agent loops",
          why: "Your agent needs reliable function-calling to drive Stripe.",
          matching_tags: ["anthropic", "tool-use", "agents"],
        },
        {
          name: "Stripe payment APIs for AI agents",
          why: "The core money-moving primitive your demo hinges on.",
          matching_tags: ["stripe", "payments", "monetization"],
        },
        {
          name: "Eval harness for payment flows",
          why: "Payment bugs in front of judges = instant elimination.",
          matching_tags: ["anthropic", "eval", "agents"],
        },
        {
          name: "Demo Day polish",
          why: "A working demo with no story still loses.",
          matching_tags: ["aabw", "pitch", "demo"],
        },
      ],
      success_criteria: [
        "Agent demos a real $1 charge end-to-end on stage",
        "3 happy-path + 2 failure-mode evals pass before Friday",
        "90-second demo script locked Thursday night",
      ],
    },
    sessions: [
      {
        session_id: "d1-anthropic-claude-intro",
        reason: "Foundation: how Claude agents call tools reliably.",
        status: "recommended",
      },
      {
        session_id: "d2-anthropic-tooluse",
        reason: "Deep dive on the patterns you'll lean on for Stripe calls.",
        status: "recommended",
      },
      {
        session_id: "d3-stripe-payments-agents",
        reason: "Direct fit — this IS your goal.",
        status: "recommended",
      },
      {
        session_id: "d3-anthropic-evals",
        reason: "Catch the payment edge cases before they catch you.",
        status: "recommended",
      },
      {
        session_id: "d4-clinic-tooluse",
        reason: "Live debug your tool-call retries before demo day.",
        status: "recommended",
      },
      {
        session_id: "d4-pitch-coaching",
        reason: "Sharpen the story arc judges will hear.",
        status: "recommended",
      },
      {
        session_id: "d5-demo-day",
        reason: "Ship it.",
        status: "recommended",
      },
    ],
    readiness_pct: 62,
    last_change: null,
  },
  altPaths: {
    // Visitor marks the tool-use deep dive attended.
    "d2-anthropic-tooluse:attended": {
      prerequisites: {} as never, // re-attached at runtime from initial
      sessions: [
        {
          session_id: "d1-anthropic-claude-intro",
          reason: "Foundation: how Claude agents call tools reliably.",
          status: "recommended",
        },
        {
          session_id: "d2-anthropic-tooluse",
          reason: "Attended ✓ — tool-use fundamentals locked.",
          status: "attended",
        },
        {
          session_id: "d3-stripe-payments-agents",
          reason: "Direct fit — this IS your goal.",
          status: "recommended",
        },
        {
          session_id: "d3-anthropic-evals",
          reason: "Catch the payment edge cases before they catch you.",
          status: "recommended",
        },
        {
          session_id: "d4-clinic-tooluse",
          reason: "Optional now — bring specific bugs if you hit any.",
          status: "recommended",
        },
        {
          session_id: "d4-pitch-coaching",
          reason: "Sharpen the story arc judges will hear.",
          status: "recommended",
        },
        {
          session_id: "d5-demo-day",
          reason: "Ship it.",
          status: "recommended",
        },
      ],
      readiness_pct: 71,
      last_change: [
        {
          op: "reordered",
          session_id: "d4-clinic-tooluse",
          reason: "Lower-priority now — you have the core patterns.",
        },
      ],
    },
    // Visitor marks Stripe session skipped — path swaps in Apify monetization.
    "d3-stripe-payments-agents:skipped": {
      prerequisites: {} as never,
      sessions: [
        {
          session_id: "d1-anthropic-claude-intro",
          reason: "Foundation: how Claude agents call tools reliably.",
          status: "recommended",
        },
        {
          session_id: "d2-anthropic-tooluse",
          reason: "Deep dive on the patterns you'll lean on for Stripe calls.",
          status: "recommended",
        },
        {
          session_id: "d3-stripe-payments-agents",
          reason: "Skipped — you're going to learn Stripe on your own.",
          status: "skipped",
        },
        {
          session_id: "d3-apify-monetize-agents",
          reason: "Added: closest monetization angle still on the schedule.",
          status: "recommended",
        },
        {
          session_id: "d3-anthropic-evals",
          reason: "Catch the payment edge cases before they catch you.",
          status: "recommended",
        },
        {
          session_id: "d4-clinic-tooluse",
          reason: "Bring your Stripe integration bugs here.",
          status: "recommended",
        },
        {
          session_id: "d4-pitch-coaching",
          reason: "Sharpen the story arc judges will hear.",
          status: "recommended",
        },
        {
          session_id: "d5-demo-day",
          reason: "Ship it.",
          status: "recommended",
        },
      ],
      readiness_pct: 50,
      last_change: [
        {
          op: "removed",
          session_id: "d3-stripe-payments-agents",
          reason: "You marked this skipped.",
        },
        {
          op: "added",
          session_id: "d3-apify-monetize-agents",
          reason:
            "Fills the monetization gap — you'll still need the concepts.",
        },
      ],
    },
  },
};
