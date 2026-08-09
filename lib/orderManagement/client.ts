import type { OmsOrderRow, OmsOverview, OrderManagementStatus } from "./types";

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
  if (!base) throw new Error("orderManagement.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "orderManagement.requestFailed");
  return data;
}

export function isOrderManagementApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchOrderManagementStatus(): Promise<OrderManagementStatus> {
  const base = apiBase();
  if (!base) throw new Error("orderManagement.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("orderManagement.requestFailed");
  const data = (await res.json()) as { orderManagement?: OrderManagementStatus };
  if (!data.orderManagement?.enabled) throw new Error("orderManagement.disabled");
  return data.orderManagement;
}

export async function fetchOmsOverview(): Promise<OmsOverview> {
  return adminRequest<OmsOverview>("/api/admin/order-management/overview");
}

export async function fetchOmsOrders(search = "", status = "", channel = ""): Promise<OmsOrderRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (channel) params.set("channel", channel);
  const query = params.toString();
  return adminRequest<OmsOrderRow[]>(`/api/admin/order-management/orders${query ? `?${query}` : ""}`);
}

export async function cancelOmsOrder(id: number, reason = ""): Promise<{ ok: boolean }> {
  return adminRequest<{ ok: boolean }>(`/api/admin/order-management/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function updateOmsOrderStatus(id: number, status: string, message = ""): Promise<OmsOrderRow> {
  return adminRequest<OmsOrderRow>(`/api/admin/order-management/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, message }),
  });
}
