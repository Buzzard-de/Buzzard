import { getAdminToken } from "@/lib/admin/client";

export interface ProductionArmingDashboard {
  armingCount: number;
  armed: number;
  blocked: number;
  ready: number;
  createOrderCapability: string;
  validationEvidence: string;
  armingState: string;
  productionOrderNetwork: string;
  realSupplierOrderCalls: number;
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

export async function fetchProductionArmingDashboard() {
  return request<{ success: boolean; data: ProductionArmingDashboard }>(
    "/api/admin/supplier-production-order-arming/dashboard",
  );
}

export async function requestProductionOrderArming(body?: { market?: string; channel?: string }) {
  return request<{ success: boolean; data: unknown }>("/api/admin/supplier-production-order-arming/request", {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
}
