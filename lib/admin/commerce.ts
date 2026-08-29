import type {
  CommerceFeatureFlags,
  CommerceHealth,
  CommerceReadiness,
  GoLiveRequest,
} from "./commerceTypes";

const TOKEN_KEY = "buzzard_admin_token";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string };
  if (!res.ok) throw new Error((data as { errorKey?: string }).errorKey || "admin.requestFailed");
  return data;
}

export async function fetchCommerceOverview(): Promise<{
  health: CommerceHealth;
  readiness: CommerceReadiness;
  flags: CommerceFeatureFlags;
  ordersByType: Record<string, number>;
  goLiveRequests: GoLiveRequest[];
  salesActivation: { allowed: boolean; code?: string; message?: string };
}> {
  const data = await request<{
    success: boolean;
    health: CommerceHealth;
    readiness: CommerceReadiness;
    flags: CommerceFeatureFlags;
    ordersByType: Record<string, number>;
    goLiveRequests: GoLiveRequest[];
    salesActivation: { allowed: boolean; code?: string; message?: string };
  }>("/api/admin/commerce/overview");
  return {
    health: data.health,
    readiness: data.readiness,
    flags: data.flags,
    ordersByType: data.ordersByType,
    goLiveRequests: data.goLiveRequests,
    salesActivation: data.salesActivation,
  };
}

export async function requestGoLive(notes?: string): Promise<{ id: string; status: string }> {
  const data = await request<{ success: boolean; id: string; status: string }>("/api/admin/commerce/go-live/request", {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
  return { id: data.id, status: data.status };
}

export async function approveGoLive(id: string): Promise<{ salesEnabled: boolean; message?: string }> {
  const data = await request<{ success: boolean; salesEnabled: boolean; message?: string }>(
    `/api/admin/commerce/go-live/${encodeURIComponent(id)}/approve`,
    { method: "POST", body: JSON.stringify({}) }
  );
  return { salesEnabled: data.salesEnabled, message: data.message };
}

export async function fetchCommerceSecurityEvents(): Promise<Array<{ type: string; timestamp: string; severity: string }>> {
  const data = await request<{ success: boolean; events: Array<{ type: string; timestamp: string; severity: string }> }>(
    "/api/admin/commerce/security-events"
  );
  return data.events;
}
