import { getAdminToken } from "@/lib/admin/client";

export interface FirstProductionOrderDashboard {
  executionCount: number;
  blocked: number;
  ready: number;
  authorized: number;
  executed: number;
  unknownOutcomes: number;
  createOrderCapability: "UNVERIFIED" | "VALIDATED" | "BLOCKED";
  validationEvidence: "PRESENT" | "NONE";
  armingState: string;
  firstOrderState: string;
  productionOrderNetwork: "OFF" | "ON";
  realSupplierHttpCalls: number;
  realSupplierOrders: number;
  realCustomerOrders: number;
  blockers: string[];
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

export async function fetchFirstProductionOrderDashboard() {
  return request<{ success: boolean; data: FirstProductionOrderDashboard }>(
    "/api/admin/supplier-first-production-order/dashboard",
  );
}

export async function requestFirstProductionOrder(body?: { armingId?: string; market?: string; channel?: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-first-production-order/request", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}
