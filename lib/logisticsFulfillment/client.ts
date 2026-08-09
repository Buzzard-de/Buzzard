import type {
  FulfillmentJob,
  LogisticsCarrier,
  LogisticsFulfillmentStatus,
  LogisticsReturn,
  LogisticsShipment,
  ShippingOption,
} from "./types";

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
  if (!base) throw new Error("logisticsFulfillment.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "logisticsFulfillment.requestFailed");
  return data;
}

export function isLogisticsFulfillmentApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchLogisticsFulfillmentStatus(): Promise<LogisticsFulfillmentStatus> {
  const base = apiBase();
  if (!base) throw new Error("logisticsFulfillment.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("logisticsFulfillment.requestFailed");
  const data = (await res.json()) as { logisticsFulfillment?: LogisticsFulfillmentStatus };
  if (!data.logisticsFulfillment?.enabled) throw new Error("logisticsFulfillment.disabled");
  return data.logisticsFulfillment;
}

export async function fetchShippingOptions(country: string): Promise<ShippingOption[]> {
  const base = apiBase();
  if (!base) return [];
  const res = await fetch(
    `${base}/api/logistics-fulfillment/shipping/options/${encodeURIComponent(country)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return [];
  return (await res.json()) as ShippingOption[];
}

export async function fetchLogisticsCarriers(): Promise<LogisticsCarrier[]> {
  return adminRequest<LogisticsCarrier[]>("/api/admin/logistics-fulfillment/carriers");
}

export async function fetchLogisticsShipments(): Promise<LogisticsShipment[]> {
  return adminRequest<LogisticsShipment[]>("/api/admin/logistics-fulfillment/shipments");
}

export async function fetchLogisticsReturns(): Promise<LogisticsReturn[]> {
  return adminRequest<LogisticsReturn[]>("/api/admin/logistics-fulfillment/returns");
}

export async function fetchFulfillmentJobs(): Promise<FulfillmentJob[]> {
  return adminRequest<FulfillmentJob[]>("/api/admin/logistics-fulfillment/jobs");
}

export async function quoteLogisticsShipment(body: {
  country: string;
  weightKg?: number;
}): Promise<ShippingOption> {
  return adminRequest<ShippingOption>("/api/admin/logistics-fulfillment/shipments/quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createLogisticsShipment(body: {
  orderNumber: string;
  country: string;
  serviceId: number;
}): Promise<LogisticsShipment> {
  return adminRequest<LogisticsShipment>("/api/admin/logistics-fulfillment/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLogisticsReturn(
  id: number,
  body: { status?: string; returnTracking?: string; refundStatus?: string }
): Promise<LogisticsReturn> {
  return adminRequest<LogisticsReturn>(`/api/admin/logistics-fulfillment/returns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
