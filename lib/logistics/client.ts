import type { Fulfillment, ReturnRequest, Shipment, SupplierOrder } from "./types";
import { apiBaseUrl } from "@/lib/api/config";

const TOKEN_KEY = "buzzard_account_token";
const ADMIN_TOKEN_KEY = "buzzard_admin_token";

function apiBase(): string {
  return apiBaseUrl();
}

function requireApiBase(): string {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  return base;
}

function accountHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchOrderShipments(orderNumber: string): Promise<Shipment[]> {
  const base = apiBase();
  if (!base) return [];
  const res = await fetch(`${base}/api/account/orders/${encodeURIComponent(orderNumber)}/shipments`, {
    headers: accountHeaders(),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { shipments?: Shipment[] };
  return data.shipments || [];
}

export async function submitReturnRequest(
  orderNumber: string,
  body: { items: Array<{ productId?: string; sku?: string; qty: number }>; reason: string }
): Promise<ReturnRequest | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/account/orders/${encodeURIComponent(orderNumber)}/returns`, {
    method: "POST",
    headers: accountHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { returnRequest?: ReturnRequest };
  return data.returnRequest || null;
}

export async function fetchAdminFulfillments(orderNumber?: string): Promise<Fulfillment[]> {
  const base = requireApiBase();
  const qs = orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : "";
  const res = await fetch(`${base}/api/admin/logistics/fulfillments${qs}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("admin.requestFailed");
  const data = (await res.json()) as { fulfillments: Fulfillment[] };
  return data.fulfillments;
}

export async function fetchAdminShipments(orderNumber?: string): Promise<Shipment[]> {
  const base = requireApiBase();
  const qs = orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : "";
  const res = await fetch(`${base}/api/admin/logistics/shipments${qs}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("admin.requestFailed");
  const data = (await res.json()) as { shipments: Shipment[] };
  return data.shipments;
}

export async function fetchAdminSupplierOrders(orderNumber?: string): Promise<SupplierOrder[]> {
  const base = requireApiBase();
  const qs = orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : "";
  const res = await fetch(`${base}/api/admin/logistics/supplier-orders${qs}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("admin.requestFailed");
  const data = (await res.json()) as { supplierOrders: SupplierOrder[] };
  return data.supplierOrders;
}

export async function fetchAdminReturns(): Promise<ReturnRequest[]> {
  const base = requireApiBase();
  const res = await fetch(`${base}/api/admin/logistics/returns`, { headers: adminHeaders() });
  if (!res.ok) throw new Error("admin.requestFailed");
  const data = (await res.json()) as { returns: ReturnRequest[] };
  return data.returns;
}

export async function retryAdminFulfillment(id: string): Promise<void> {
  const base = requireApiBase();
  const res = await fetch(`${base}/api/admin/logistics/fulfillments/${encodeURIComponent(id)}/retry`, {
    method: "POST",
    headers: adminHeaders(),
    body: "{}",
  });
  if (!res.ok) throw new Error("admin.requestFailed");
}

export async function updateAdminShipment(
  id: string,
  patch: { trackingNumber?: string; carrier?: string; status?: string }
): Promise<Shipment> {
  const base = requireApiBase();
  const res = await fetch(`${base}/api/admin/logistics/shipments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("admin.requestFailed");
  const data = (await res.json()) as { shipment: Shipment };
  return data.shipment;
}

export async function updateAdminReturnStatus(id: string, status: string): Promise<ReturnRequest> {
  const base = requireApiBase();
  const res = await fetch(`${base}/api/admin/logistics/returns/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("admin.requestFailed");
  const data = (await res.json()) as { returnRequest: ReturnRequest };
  return data.returnRequest;
}
