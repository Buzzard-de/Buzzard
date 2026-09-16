import { getAdminToken } from "@/lib/admin/client";

export interface RehearsalDashboard {
  rehearsalCount: number;
  passed: number;
  failed: number;
  blocked: number;
  running: number;
  criticalFailures: number;
  suppliersTested: number;
  marketsTested: number;
  channelsTested: number;
  averageDurationMs: number;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  rehearsalMode: "ACTIVE" | "COMPLETE";
  safety: {
    realSupplierOrderHttpCalls: number;
    realCustomerShipments: number;
    realPaymentCaptures: number;
    realMarketplaceSubmissions: number;
    realCarrierCalls: number;
    realSupplierReturns: number;
    realSupplierRefunds: number;
  };
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

async function rehearsalRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchSupplierOrderRehearsalDashboard() {
  return rehearsalRequest<{ success: boolean; data: RehearsalDashboard }>(
    "/api/admin/supplier-order-rehearsal/dashboard"
  );
}

export async function fetchSupplierOrderRehearsalRecords(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return rehearsalRequest<{ success: boolean; data: Array<Record<string, unknown>> }>(
    `/api/admin/supplier-order-rehearsal/records${qs}`
  );
}

export async function runSupplierOrderRehearsal(body: {
  market?: string;
  channel?: string;
  productId?: string;
  approverEmail?: string;
  failureInjection?: string;
}) {
  return rehearsalRequest<{ success: boolean; data: Record<string, unknown>; safety: Record<string, unknown> }>(
    "/api/admin/supplier-order-rehearsal/run",
    { method: "POST", body: JSON.stringify(body) }
  );
}
