import type { AiCenterOverview, AiCenterStatus, AiChatResponse, AiJobRow } from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function adminHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
  };
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("aiCenter.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "aiCenter.requestFailed");
  return data;
}

export function isAiCenterApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchAiCenterStatus(): Promise<AiCenterStatus> {
  const base = apiBase();
  if (!base) throw new Error("aiCenter.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("aiCenter.requestFailed");
  const data = (await res.json()) as { aiCenter?: AiCenterStatus };
  if (!data.aiCenter?.enabled) throw new Error("aiCenter.disabled");
  return data.aiCenter;
}

export async function fetchAiCenterOverview(): Promise<AiCenterOverview> {
  return adminRequest<AiCenterOverview>("/api/admin/ai-center/overview");
}

export async function fetchAiJobs(): Promise<AiJobRow[]> {
  return adminRequest<AiJobRow[]>("/api/admin/ai-center/jobs");
}

export async function sendAiCenterChat(message: string, language = "de"): Promise<AiChatResponse> {
  const base = apiBase();
  if (!base) throw new Error("aiCenter.apiUnavailable");
  const res = await fetch(`${base}/api/ai-center/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ message, language }),
  });
  const data = (await res.json()) as AiChatResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "aiCenter.requestFailed");
  return data;
}
