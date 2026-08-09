import type { LogisticsV34Overview, LogisticsV34Record, LogisticsV34Status } from "./types";

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
  if (!base) throw new Error("logisticsV34.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "logisticsV34.requestFailed");
  return data;
}

export async function fetchLogisticsV34Status(): Promise<LogisticsV34Status> {
  const base = apiBase();
  if (!base) throw new Error("logisticsV34.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("logisticsV34.requestFailed");
  const data = (await res.json()) as { logisticsV34?: LogisticsV34Status };
  if (!data.logisticsV34?.enabled) throw new Error("logisticsV34.disabled");
  return data.logisticsV34;
}

export async function fetchLogisticsV34Overview(): Promise<LogisticsV34Overview> {
  return adminRequest<LogisticsV34Overview>("/api/admin/logistics-v34/overview");
}

export async function fetchLogisticsV34Records(): Promise<LogisticsV34Record[]> {
  return adminRequest<LogisticsV34Record[]>("/api/logistics-v34/records");
}
