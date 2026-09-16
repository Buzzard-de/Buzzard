import { getAdminToken } from "@/lib/admin/client";

export interface CreateOrderValidationDashboard {
  validationCount: number;
  passed: number;
  blocked: number;
  failed: number;
  skipped: number;
  createOrderCapability: "UNVERIFIED" | "VALIDATED" | "BLOCKED";
  trackingCapability: "UNVERIFIED" | "VALIDATED" | "DECLARED";
  productionOrderNetwork: "OFF" | "ON";
  realSupplierOrderCalls: number;
  realCustomerOrders: number;
  blockers: string[];
  safety: Record<string, number>;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  const data = (await res.json()) as T & { success?: boolean; errorCode?: string };
  if (!res.ok) throw new Error(data.errorCode || "admin.requestFailed");
  return data;
}

export async function fetchCreateOrderValidationDashboard() {
  return request<{ success: boolean; data: CreateOrderValidationDashboard }>(
    "/api/admin/supplier-production-order-validation/dashboard",
  );
}

export async function runCreateOrderProductionValidation(body: {
  supplierId?: string;
  market?: string;
  channel?: string;
  orderId?: string;
  failureInjection?: string;
}) {
  return request<{ success: boolean; data: Record<string, unknown>; safety: Record<string, number> }>(
    "/api/admin/supplier-production-order-validation/run",
    { method: "POST", body: JSON.stringify(body) },
  );
}
