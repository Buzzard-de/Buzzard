import { getAdminToken } from "@/lib/admin/client";

export interface ReadinessDashboard {
  suppliersReady: number;
  suppliersBlocked: number;
  marketsReady: number;
  channelsReady: number;
  pendingApprovals: number;
  expiredApprovals: number;
  criticalBlockers: number;
  networkStatus: "DISABLED" | "ENABLED";
  globalKillSwitch: boolean;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  currentEnvironment: "SANDBOX" | "PRODUCTION";
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

async function readinessRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchSupplierOrderReadinessDashboard() {
  return readinessRequest<{ success: boolean; data: ReadinessDashboard }>(
    "/api/admin/supplier-order-readiness/dashboard"
  );
}

export async function fetchSupplierOrderReadinessRecords(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return readinessRequest<{ success: boolean; data: Array<Record<string, unknown>> }>(
    `/api/admin/supplier-order-readiness/records${qs}`
  );
}

export async function evaluateSupplierOrderReadinessScope(body: {
  supplierId: string;
  market: string;
  channel: string;
}) {
  return readinessRequest<{ success: boolean; data: Record<string, unknown> }>(
    "/api/admin/supplier-order-readiness/evaluate",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function previewSupplierOrderActivation(body: {
  supplierId: string;
  market: string;
  channel: string;
}) {
  return readinessRequest<{ success: boolean; data: Record<string, unknown> }>(
    "/api/admin/supplier-order-readiness/preview",
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function requestSupplierOrderApproval(body: { readinessId: string }) {
  return readinessRequest<{ success: boolean; data: Record<string, unknown> }>(
    "/api/admin/supplier-order-readiness/approval/request",
    { method: "POST", body: JSON.stringify(body) }
  );
}
