import type { AdvancedSearchStatus, SearchOverview, ZeroResultRow } from "./types";
import { withAdminCredentials } from "@/lib/admin/authTransport";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("advancedSearch.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.errorKey || "advancedSearch.requestFailed");
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
