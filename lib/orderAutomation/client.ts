import type {
  AutomationJob,
  IntegrationEventRow,
  OrderAutomationStatus,
  OrderFlowDetail,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  const accountToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;
  const token = adminToken || accountToken;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("orderAutomation.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "orderAutomation.requestFailed");
  return data;
}

export function isOrderAutomationApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchOrderAutomationStatus(): Promise<OrderAutomationStatus> {
  return request<OrderAutomationStatus>("/api/admin/automation-status");
}

export async function fetchAutomationJobs(limit = 50): Promise<AutomationJob[]> {
  return request<AutomationJob[]>(`/api/admin/jobs?limit=${limit}`);
}

export async function fetchIntegrationEvents(limit = 50): Promise<IntegrationEventRow[]> {
  return request<IntegrationEventRow[]>(`/api/admin/events?limit=${limit}`);
}

export async function queueOrderAutomation(orderNumber: string): Promise<{ ok: boolean; orderNumber: string }> {
  return request("/api/automation/order-created", {
    method: "POST",
    body: JSON.stringify({ orderNumber }),
  });
}

export async function retryAutomationJob(id: number): Promise<{ ok: boolean }> {
  return request(`/api/admin/jobs/${id}/retry`, { method: "POST", body: "{}" });
}

export async function fetchOrderFlowDetail(orderNumber: string): Promise<OrderFlowDetail> {
  return request<OrderFlowDetail>(`/api/admin/order-flow/${encodeURIComponent(orderNumber)}`);
}
