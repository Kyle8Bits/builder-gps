"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

type ClientId = "claude-desktop" | "claude-code" | "cursor" | "windsurf";
type Os = "mac" | "win" | "linux";

interface McpConnectModalProps {
  open: boolean;
  onClose: () => void;
  builderId: string;
  apiUrl: string;
}

interface ClientTab {
  id: ClientId;
  label: string;
  pathLabel: string;
  paths: Record<Os, string> | null; // null → no config path step (e.g. CLI)
  configFormat: "json" | "command";
}

const TABS: ClientTab[] = [
  {
    id: "claude-desktop",
    label: "Claude Desktop",
    pathLabel: "Edit your config file",
    paths: {
      mac: "~/Library/Application Support/Claude/claude_desktop_config.json",
      win: "%APPDATA%\\Claude\\claude_desktop_config.json",
      linux: "~/.config/Claude/claude_desktop_config.json",
    },
    configFormat: "json",
  },
  {
    id: "claude-code",
    label: "Claude Code",
    pathLabel: "Run this one-liner",
    paths: null,
    configFormat: "command",
  },
  {
    id: "cursor",
    label: "Cursor",
    pathLabel: "Edit your MCP config",
    paths: {
      mac: "~/.cursor/mcp.json",
      win: "%USERPROFILE%\\.cursor\\mcp.json",
      linux: "~/.cursor/mcp.json",
    },
    configFormat: "json",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    pathLabel: "Edit your MCP config",
    paths: {
      mac: "~/.codeium/windsurf/mcp_config.json",
      win: "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json",
      linux: "~/.codeium/windsurf/mcp_config.json",
    },
    configFormat: "json",
  },
];

const OS_LABELS: Record<Os, string> = {
  mac: "macOS",
  win: "Windows",
  linux: "Linux",
};

function detectOs(): Os {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "win";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "mac";
}

// When NEXT_PUBLIC_MCP_PACKAGE_PUBLISHED=true, the PyPI package is live →
// `pipx install builder-gps-mcp` works → the config can use just the bare
// command since pipx puts it on PATH. Otherwise fall back to the dev-install
// path with an abs-path placeholder.
const PACKAGE_PUBLISHED =
  process.env.NEXT_PUBLIC_MCP_PACKAGE_PUBLISHED === "true";

const COMMAND_VALUE = PACKAGE_PUBLISHED
  ? "builder-gps-mcp"
  : "/abs/path/to/builder-gps-mcp";

const INSTALL_CMD = PACKAGE_PUBLISHED
  ? "pipx install builder-gps-mcp"
  : "cd builder-gps/apps/mcp && pip install -e . && realpath ./venv/bin/builder-gps-mcp";

const INSTALL_NOTE = PACKAGE_PUBLISHED
  ? "Need pipx? `brew install pipx` (Mac) or see https://pipx.pypa.io"
  : "The last command prints the absolute path you paste back into command.";

function buildJson(builderId: string, apiUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        "builder-gps": {
          command: COMMAND_VALUE,
          env: {
            BUILDER_GPS_API_URL: apiUrl,
            BUILDER_GPS_BUILDER_ID: builderId,
          },
        },
      },
    },
    null,
    2
  );
}

function buildClaudeCodeCmd(builderId: string, apiUrl: string): string {
  return `claude mcp add builder-gps \\
  --env BUILDER_GPS_API_URL=${apiUrl} \\
  --env BUILDER_GPS_BUILDER_ID=${builderId} \\
  -- ${COMMAND_VALUE}`;
}

export function McpConnectModal({
  open,
  onClose,
  builderId,
  apiUrl,
}: McpConnectModalProps) {
  const [active, setActive] = useState<ClientId>("claude-desktop");
  const [os, setOs] = useState<Os>("mac");
  const [copied, setCopied] = useState<string | null>(null);

  // Detect OS once after mount (avoids SSR mismatch).
  useEffect(() => {
    setOs(detectOs());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const tab = useMemo(
    () => TABS.find((t) => t.id === active) ?? TABS[0],
    [active]
  );

  const snippet = useMemo(
    () =>
      tab.configFormat === "json"
        ? buildJson(builderId, apiUrl)
        : buildClaudeCodeCmd(builderId, apiUrl),
    [tab, builderId, apiUrl]
  );

  if (!open) return null;
  if (typeof document === "undefined") return null;

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  const configPath = tab.paths?.[os] ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mcp-modal-title"
    >
      <div
        className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-900 px-6 py-5">
          <div>
            <h2
              id="mcp-modal-title"
              className="text-lg font-semibold text-neutral-50"
            >
              Connect Builder GPS to your AI
            </h2>
            <p className="mt-1 text-[13px] text-neutral-400">
              Ask your editor{" "}
              <span className="italic text-neutral-200">
                "what's next on my AABW schedule?"
              </span>{" "}
              and it reads your live path.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 cursor-pointer rounded-full px-2.5 py-1.5 text-neutral-500 transition-colors duration-150 hover:bg-neutral-900 hover:text-neutral-200"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div
          role="tablist"
          aria-label="AI client"
          className="flex flex-wrap gap-1 border-b border-neutral-900 px-6 pt-3"
        >
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={cn(
                  "cursor-pointer rounded-t-md px-3.5 py-2 text-xs font-medium transition-colors duration-150",
                  isActive
                    ? "border-b-2 border-brand-400 text-brand-200"
                    : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-200"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">
          <Step
            n={1}
            title={
              tab.configFormat === "json"
                ? "Copy this config"
                : "Copy this command"
            }
          >
            <CodeBlock
              code={snippet}
              language={tab.configFormat === "json" ? "json" : "shell"}
              onCopy={() => copy(snippet, "snippet")}
              copied={copied === "snippet"}
            />
            {!PACKAGE_PUBLISHED && (
              <p className="text-[11px] text-neutral-500">
                Replace{" "}
                <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-neutral-300">
                  /abs/path/to/builder-gps-mcp
                </code>{" "}
                with the output of{" "}
                <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-neutral-300">
                  realpath $(which builder-gps-mcp)
                </code>
                .
              </p>
            )}
          </Step>

          {configPath && (
            <Step n={2} title={tab.pathLabel}>
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="text-neutral-500">Your OS:</span>
                {(Object.keys(OS_LABELS) as Os[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOs(key)}
                    className={cn(
                      "cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors duration-150",
                      os === key
                        ? "border-brand-500 bg-brand-500/15 text-brand-100"
                        : "border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-200"
                    )}
                  >
                    {OS_LABELS[key]}
                  </button>
                ))}
              </div>
              <CodeBlock
                code={configPath}
                language="path"
                onCopy={() => copy(configPath, "path")}
                copied={copied === "path"}
              />
            </Step>
          )}

          <Step
            n={configPath ? 3 : 2}
            title={
              tab.id === "claude-code"
                ? "Verify it loaded"
                : `Restart ${tab.label} fully (Cmd+Q, reopen)`
            }
          >
            <p className="text-[13px] text-neutral-300">
              Then ask:{" "}
              <span className="rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[12px] text-brand-200">
                What's next on my AABW schedule?
              </span>
            </p>
          </Step>

          <div className="mt-1 flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-200">
                {PACKAGE_PUBLISHED
                  ? "Install the server (one command)"
                  : "Don't have the server installed?"}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
                  PACKAGE_PUBLISHED
                    ? "border-brand-700/60 bg-brand-500/10 text-brand-300"
                    : "border-neutral-800 text-neutral-500"
                )}
              >
                {PACKAGE_PUBLISHED ? "PyPI" : "local"}
              </span>
            </div>
            <CodeBlock
              code={INSTALL_CMD}
              language="shell"
              onCopy={() => copy(INSTALL_CMD, "install")}
              copied={copied === "install"}
            />
            <p className="text-[11px] text-neutral-500">{INSTALL_NOTE}</p>
          </div>

          <details className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-4 py-3 text-[12px] text-neutral-400">
            <summary className="cursor-pointer text-neutral-300">
              Your builder ID (already filled into the config)
            </summary>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-neutral-950 px-3 py-2">
              <code className="break-all font-mono text-[11px] text-brand-300">
                {builderId}
              </code>
              <button
                type="button"
                onClick={() => copy(builderId, "uuid")}
                className="shrink-0 cursor-pointer rounded border border-neutral-700 px-2 py-1 text-[10px] uppercase tracking-wider text-neutral-300 hover:border-neutral-500"
              >
                {copied === "uuid" ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-amber-500/70">
              Treat like a password — anyone with it can mark sessions as you.
            </p>
          </details>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-brand-700/60 bg-brand-500/10 text-[10px]">
          {n}
        </span>
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function CodeBlock({
  code,
  language,
  onCopy,
  copied,
}: {
  code: string;
  language: "json" | "shell" | "path";
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-900 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-neutral-600">
          {language}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            "cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors duration-150",
            copied
              ? "bg-brand-500/20 text-brand-200"
              : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
          )}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed text-neutral-200">
        {code}
      </pre>
    </div>
  );
}
