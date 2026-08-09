import type { AdvancedSearchStatus, SearchOverview, ZeroResultRow } from "./types";

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
  if (!base) throw new Error("advancedSearch.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "advancedSearch.requestFailed");
  return data;
}

export function isAdvancedSearchApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchAdvancedSearchStatus(): Promise<AdvancedSearchStatus> {
  const base = apiBase();
  if (!base) throw new Error("advancedSearch.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("advancedSearch.requestFailed");
  const data = (await res.json()) as { advancedSearch?: AdvancedSearchStatus };
  if (!data.advancedSearch?.enabled) throw new Error("advancedSearch.disabled");
  return data.advancedSearch;
}

export async function fetchSearchOverview(): Promise<SearchOverview> {
  return adminRequest<SearchOverview>("/api/admin/advanced-search/overview");
}

export async function fetchZeroResultQueries(): Promise<ZeroResultRow[]> {
  return adminRequest<ZeroResultRow[]>("/api/admin/advanced-search/zero-results");
}
