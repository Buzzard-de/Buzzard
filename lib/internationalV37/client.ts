import type { InternationalV37Overview, InternationalV37Record, InternationalV37Status } from "./types";

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
  if (!base) throw new Error("internationalV37.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "internationalV37.requestFailed");
  return data;
}

export async function fetchInternationalV37Status(): Promise<InternationalV37Status> {
  const base = apiBase();
  if (!base) throw new Error("internationalV37.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("internationalV37.requestFailed");
  const data = (await res.json()) as { internationalV37?: InternationalV37Status };
  if (!data.internationalV37?.enabled) throw new Error("internationalV37.disabled");
  return data.internationalV37;
}

export async function fetchInternationalV37Overview(): Promise<InternationalV37Overview> {
  return adminRequest<InternationalV37Overview>("/api/admin/international-v37/overview");
}

export async function fetchInternationalV37Records(): Promise<InternationalV37Record[]> {
  return adminRequest<InternationalV37Record[]>("/api/international-v37/records");
}
