import { getAdminToken } from "@/lib/admin/client";

export interface ActivationDashboard {
  activationCount: number;
  blocked: number;
  approved: number;
  armed: number;
  active: number;
  firstOrdersPrepared: number;
  firstOrdersSent: number;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  interCarsCreateOrder: "UNVERIFIED" | "VALIDATED";
  productionActivation: "NOT ACTIVE" | "ARMED" | "ACTIVE";
  firstRealOrder: "NOT SENT" | "SENT";
  networkState: "DISABLED" | "ARMED" | "ENABLED";
  safety: {
    realSupplierOrderCalls: number;
    realSupplierCancelCalls: number;
    realSupplierReturnCalls: number;
    realSupplierRefundCalls: number;
    realPaymentCalls: number;
    realMarketplaceCalls: number;
    realCarrierCalls: number;
    realCustomerShipments: number;
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

async function activationRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchActivationDashboard() {
  return activationRequest<{ success: boolean; data: ActivationDashboard }>(
    "/api/admin/supplier-order-activation/dashboard"
  );
}

export async function fetchActivationRecords(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return activationRequest<{ success: boolean; data: Array<Record<string, unknown>> }>(
    `/api/admin/supplier-order-activation/records${qs}`
  );
}

export async function runActivationPreflight(body: {
  supplierId?: string;
  market?: string;
  channel?: string;
  environment?: string;
}) {
  return activationRequest<{ success: boolean; data: Record<string, unknown> }>(
    "/api/admin/supplier-order-activation/preflight",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function createActivationRequest(body: {
  supplierId?: string;
  market?: string;
  channel?: string;
  idempotencyKey?: string;
}) {
  return activationRequest<{ success: boolean; data: Record<string, unknown>; safety: Record<string, unknown> }>(
    "/api/admin/supplier-order-activation/request",
    { method: "POST", body: JSON.stringify(body) }
  );
}
