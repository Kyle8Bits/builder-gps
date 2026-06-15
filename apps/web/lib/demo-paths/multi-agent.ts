import type { Persona } from "./types";

export const multiAgent: Persona = {
  id: "multi-agent",
  label: "Multi-agent research",
  goal: "Ship a multi-agent research system by Friday",
  stack: ["python", "anthropic", "langchain"],
  experience: "advanced",
  initial: {
    prerequisites: {
      capabilities: [
        {
          name: "Stateful multi-agent orchestration",
          why: "LangGraph + custom coordinators carry the architecture.",
          matching_tags: ["langchain", "multi-agent", "agents"],
        },
        {
          name: "Memory + retrieval patterns",
          why: "Agents that forget context are agents that fail demos.",
          matching_tags: ["langchain", "memory", "agents"],
        },
        {
          name: "Cross-agent observability",
          why: "When 3 agents fail, traces tell you which one and why.",
          matching_tags: ["langfuse", "observability", "eval"],
        },
        {
          name: "Demo-day storytelling",
          why: "Multi-agent shines or confuses based on the explanation.",
          matching_tags: ["aabw", "pitch", "demo"],
        },
      ],
      success_criteria: [
        "3+ agents coordinate on a real research task end-to-end",
        "Traces visible across the full agent run",
        "90-second demo of the orchestration — judges grok it",
      ],
    },
    sessions: [
      {
        session_id: "d2-langchain-langgraph",
        reason: "The orchestration backbone for stateful agents.",
        status: "recommended",
      },
      {
        session_id: "d2-anthropic-mcp",
        reason: "Lets your agents share tools cleanly across processes.",
        status: "recommended",
      },
      {
        session_id: "d3-multi-agent-arch",
        reason: "Direct fit — system design patterns you'll copy.",
        status: "recommended",
      },
      {
        session_id: "d3-langchain-memory-patterns",
        reason: "Memory is what separates agents from chatbots.",
        status: "recommended",
      },
      {
        session_id: "d3-observability-langfuse",
        reason: "You can't fix multi-agent bugs you can't see.",
        status: "recommended",
      },
      {
        session_id: "d4-clinic-evals",
        reason: "Run your eval suite against an expert.",
        status: "recommended",
      },
      {
        session_id: "d4-pitch-coaching",
        reason: "Multi-agent demos confuse without a tight narrative.",
        status: "recommended",
      },
      {
        session_id: "d5-demo-day",
        reason: "Ship it.",
        status: "recommended",
      },
    ],
    readiness_pct: 58,
    last_change: null,
  },
  altPaths: {
    "d2-langchain-langgraph:attended": {
      prerequisites: {} as never,
      sessions: [
        {
          session_id: "d2-langchain-langgraph",
          reason: "Attended ✓ — orchestration backbone is yours.",
          status: "attended",
        },
        {
          session_id: "d2-anthropic-mcp",
          reason: "Lets your agents share tools cleanly across processes.",
          status: "recommended",
        },
        {
          session_id: "d3-multi-agent-arch",
          reason: "Direct fit — system design patterns you'll copy.",
          status: "recommended",
        },
        {
          session_id: "d3-langchain-memory-patterns",
          reason: "Memory is what separates agents from chatbots.",
          status: "recommended",
        },
        {
          session_id: "d3-observability-langfuse",
          reason: "You can't fix multi-agent bugs you can't see.",
          status: "recommended",
        },
        {
          session_id: "d4-clinic-evals",
          reason: "Run your eval suite against an expert.",
          status: "recommended",
        },
        {
          session_id: "d4-pitch-coaching",
          reason: "Multi-agent demos confuse without a tight narrative.",
          status: "recommended",
        },
        {
          session_id: "d5-demo-day",
          reason: "Ship it.",
          status: "recommended",
        },
      ],
      readiness_pct: 67,
      last_change: [],
    },
    "d3-multi-agent-arch:skipped": {
      prerequisites: {} as never,
      sessions: [
        {
          session_id: "d2-langchain-langgraph",
          reason: "The orchestration backbone for stateful agents.",
          status: "recommended",
        },
        {
          session_id: "d2-anthropic-mcp",
          reason: "Lets your agents share tools cleanly across processes.",
          status: "recommended",
        },
        {
          session_id: "d2-mastra-framework",
          reason: "Added: production agent patterns — covers some arch ground.",
          status: "recommended",
        },
        {
          session_id: "d3-multi-agent-arch",
          reason: "Skipped — you're going with your own architecture.",
          status: "skipped",
        },
        {
          session_id: "d3-langchain-memory-patterns",
          reason: "Memory is what separates agents from chatbots.",
          status: "recommended",
        },
        {
          session_id: "d3-observability-langfuse",
          reason: "You can't fix multi-agent bugs you can't see.",
          status: "recommended",
        },
        {
          session_id: "d4-clinic-evals",
          reason: "Run your eval suite against an expert.",
          status: "recommended",
        },
        {
          session_id: "d4-pitch-coaching",
          reason: "Multi-agent demos confuse without a tight narrative.",
          status: "recommended",
        },
        {
          session_id: "d5-demo-day",
          reason: "Ship it.",
          status: "recommended",
        },
      ],
      readiness_pct: 48,
      last_change: [
        {
          op: "removed",
          session_id: "d3-multi-agent-arch",
          reason: "You marked this skipped.",
        },
        {
          op: "added",
          session_id: "d2-mastra-framework",
          reason: "Partial substitute — production agent patterns overlap.",
        },
      ],
    },
  },
};
