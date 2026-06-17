import type {
  BuilderState,
  CapabilityResourcesMap,
  Health,
  MarkStatus,
  PathResponse,
  Session,
} from "@shared/types";

export interface BuilderMe {
  builder_id: string;
  has_path: boolean;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${path} ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export function fetchHealth(): Promise<Health> {
  return request<Health>("/health");
}

export function fetchSessions(): Promise<Session[]> {
  return request<Session[]>("/sessions");
}

export function submitBuilderState(state: BuilderState): Promise<PathResponse> {
  return request<PathResponse>("/builder/state", {
    method: "POST",
    body: JSON.stringify(state),
  });
}

export function markSession(
  sessionId: string,
  status: MarkStatus
): Promise<PathResponse> {
  return request<PathResponse>(
    `/sessions/${encodeURIComponent(sessionId)}/mark`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
    }
  );
}

export function fetchBuilderMe(): Promise<BuilderMe> {
  return request<BuilderMe>("/builder/me");
}

export function fetchPath(): Promise<PathResponse> {
  return request<PathResponse>("/path");
}

export function exportIcsUrl(): string {
  return `${API_URL}/path/export.ics`;
}

export function subscriptionIcsUrl(builderId: string): string {
  return `${API_URL}/path/${encodeURIComponent(builderId)}.ics`;
}

// Phase 07 — knowledge layer
export function fetchResources(): Promise<CapabilityResourcesMap> {
  return request<CapabilityResourcesMap>("/path/resources");
}

// Returns the raw markdown export as a Blob so the caller can trigger a
// browser download via createObjectURL. We bypass `request()` because we
// want bytes, not parsed JSON.
export async function exportPathMarkdown(): Promise<Blob> {
  const res = await fetch(`${API_URL}/path/export.md`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Export failed ${res.status}: ${body}`);
  }
  return res.blob();
}

// === Organizer admin (organizer-import plan, Phase 01) ===

export interface AdminSessionsResult {
  sessions: Session[];
  source: "override" | "file";
  count: number;
}

async function adminRequest<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Admin ${path} ${res.status}: ${body || res.statusText}`);
  }
  const data = (await res.json()) as T;
  return { data, headers: res.headers };
}

export async function fetchAdminSessions(
  token: string
): Promise<AdminSessionsResult> {
  const { data, headers } = await adminRequest<Session[]>(
    "/admin/sessions",
    token
  );
  return {
    sessions: data,
    source: (headers.get("X-Source") as "override" | "file") ?? "file",
    count: Number(headers.get("X-Count") ?? data.length),
  };
}

export async function importAdminSessions(
  token: string,
  sessions: Session[]
): Promise<{ imported: number }> {
  const { data } = await adminRequest<{ imported: number }>(
    "/admin/sessions",
    token,
    { method: "POST", body: JSON.stringify(sessions) }
  );
  return data;
}

export async function clearAdminSessions(
  token: string
): Promise<{ cleared: boolean }> {
  const { data } = await adminRequest<{ cleared: boolean }>(
    "/admin/sessions/clear",
    token,
    { method: "POST" }
  );
  return data;
}
