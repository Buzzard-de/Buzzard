import type { AnalyticsV39Overview, AnalyticsV39Record, AnalyticsV39Status } from "./types";

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
  if (!base) throw new Error("analyticsV39.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "analyticsV39.requestFailed");
  return data;
}

export async function fetchAnalyticsV39Status(): Promise<AnalyticsV39Status> {
  const base = apiBase();
  if (!base) throw new Error("analyticsV39.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("analyticsV39.requestFailed");
  const data = (await res.json()) as { analyticsV39?: AnalyticsV39Status };
  if (!data.analyticsV39?.enabled) throw new Error("analyticsV39.disabled");
  return data.analyticsV39;
}

export async function fetchAnalyticsV39Overview(): Promise<AnalyticsV39Overview> {
  return adminRequest<AnalyticsV39Overview>("/api/admin/analytics-v39/overview");
}

export async function fetchAnalyticsV39Records(): Promise<AnalyticsV39Record[]> {
  return adminRequest<AnalyticsV39Record[]>("/api/analytics-v39/records");
}
