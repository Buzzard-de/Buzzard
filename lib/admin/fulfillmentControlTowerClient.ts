import { getAdminToken } from "@/lib/admin/client";

export interface FulfillmentTowerDashboard {
  totalFulfillments: number;
  healthy: number;
  warning: number;
  mismatch: number;
  critical: number;
  openIncidents: number;
  suppliersAffected: number;
  ordersAffected: number;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  lastReconciliationRun?: Record<string, unknown>;
}

export interface FulfillmentTowerRow {
  fulfillmentId: string;
  orderId: string;
  orderNumber: string;
  supplierId: string;
  productId: string;
  operationalStatus: string;
  supplierOrderId?: string;
  supplierOrderClassification: string;
  orderStatus: string;
  supplierHealth: string;
  marketplaceId?: string;
  lastReconciledAt?: string;
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function towerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { success?: boolean; errorCode?: string };
  if (!res.ok) throw new Error(data.errorCode || "admin.requestFailed");
  return data;
}

export async function fetchFulfillmentTowerDashboard(params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  return towerRequest<{ success: boolean; data: FulfillmentTowerDashboard }>(
    `/api/admin/fulfillment-control-tower/dashboard${query}`
  );
}

export async function fetchFulfillmentTowerRows(params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  return towerRequest<{ success: boolean; data: FulfillmentTowerRow[] }>(
    `/api/admin/fulfillment-control-tower/fulfillments${query}`
  );
}

export async function fetchFulfillmentTowerDetail(fulfillmentId: string) {
  return towerRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/api/admin/fulfillment-control-tower/fulfillments/${encodeURIComponent(fulfillmentId)}`
  );
}

export async function runFulfillmentTowerReconciliation(body?: Record<string, unknown>) {
  return towerRequest<{ success: boolean; data: Record<string, unknown> }>(
    "/api/admin/fulfillment-control-tower/reconcile",
    { method: "POST", body: JSON.stringify(body || {}) }
  );
}

export async function fetchFulfillmentTowerIncidents(params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params)}` : "";
  return towerRequest<{ success: boolean; data: Array<Record<string, unknown>> }>(
    `/api/admin/fulfillment-control-tower/incidents${query}`
  );
}

export async function resolveFulfillmentTowerIncident(incidentId: string, note?: string) {
  return towerRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/api/admin/fulfillment-control-tower/incidents/${encodeURIComponent(incidentId)}/resolve`,
    { method: "POST", body: JSON.stringify({ note }) }
  );
}
