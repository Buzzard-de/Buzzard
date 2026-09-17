import { getAdminToken } from "@/lib/admin/client";

export interface ProductionAccessDashboard {
  interCarsProfile: string;
  productionCredentials: string;
  readOnlyLiveValidation: string;
  controlledLiveValidation: string;
  createOrderCapability: string;
  productionNetwork: string;
  supplierOrderNetwork: string;
  realHttpCalls: number;
  realCreateOrderCalls: number;
  blockers: string[];
  checklist: Array<{ id: string; label: string; status: string; message: string }>;
  liveValidationEvidence: string;
  armingState: string;
  firstOrderState: string;
  controlledGoLive: string;
  observationState: string;
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

export async function fetchProductionAccessDashboard() {
  return request<{ success: boolean; data: ProductionAccessDashboard }>(
    "/api/admin/inter-cars-production-access/dashboard",
  );
}

export async function runProductionAccessPreflightCheck() {
  return request<{ success: boolean; data: unknown }>("/api/admin/inter-cars-production-access/preflight", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
