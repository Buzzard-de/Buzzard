import type { ReturnsRmaStatus, RmaOverview, RmaReturnRow } from "./types";

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
  if (!base) throw new Error("returnsRma.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "returnsRma.requestFailed");
  return data;
}

export function isReturnsRmaApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchReturnsRmaStatus(): Promise<ReturnsRmaStatus> {
  const base = apiBase();
  if (!base) throw new Error("returnsRma.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("returnsRma.requestFailed");
  const data = (await res.json()) as { returnsRma?: ReturnsRmaStatus };
  if (!data.returnsRma?.enabled) throw new Error("returnsRma.disabled");
  return data.returnsRma;
}

export async function fetchRmaOverview(): Promise<RmaOverview> {
  return adminRequest<RmaOverview>("/api/admin/returns-rma/overview");
}

export async function fetchRmaReturns(search = "", status = "", reason = ""): Promise<RmaReturnRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (reason) params.set("reason", reason);
  const query = params.toString();
  return adminRequest<RmaReturnRow[]>(`/api/admin/returns-rma/returns${query ? `?${query}` : ""}`);
}
