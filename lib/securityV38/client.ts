import type { SecurityV38Overview, SecurityV38Record, SecurityV38Status } from "./types";

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
  if (!base) throw new Error("securityV38.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "securityV38.requestFailed");
  return data;
}

export async function fetchSecurityV38Status(): Promise<SecurityV38Status> {
  const base = apiBase();
  if (!base) throw new Error("securityV38.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("securityV38.requestFailed");
  const data = (await res.json()) as { securityV38?: SecurityV38Status };
  if (!data.securityV38?.enabled) throw new Error("securityV38.disabled");
  return data.securityV38;
}

export async function fetchSecurityV38Overview(): Promise<SecurityV38Overview> {
  return adminRequest<SecurityV38Overview>("/api/admin/security-v38/overview");
}

export async function fetchSecurityV38Records(): Promise<SecurityV38Record[]> {
  return adminRequest<SecurityV38Record[]>("/api/security-v38/records");
}
