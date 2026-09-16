import { getAdminToken } from "@/lib/admin/client";

export interface ProductionValidationDashboard {
  validationCount: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  running: number;
  suppliersValidated: number;
  marketsValidated: number;
  channelsValidated: number;
  lastValidationAt?: string;
  realSupplierOrderNetwork: "DISABLED" | "ENABLED";
  liveReadMode: "CONTROLLED" | "DISABLED";
  productionOrderActivation: "NOT ACTIVE";
  safety: {
    realHealthCalls: number;
    realCatalogCalls: number;
    realStockCalls: number;
    realPriceCalls: number;
    realOrderCalls: number;
    realCancelCalls: number;
    realReturnCalls: number;
    realRefundCalls: number;
    realTrackingCalls: number;
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

async function validationRequest<T>(path: string, init?: RequestInit): Promise<T> {
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

export async function fetchProductionValidationDashboard() {
  return validationRequest<{ success: boolean; data: ProductionValidationDashboard }>(
    "/api/admin/supplier-production-validation/dashboard"
  );
}

export async function fetchProductionValidationRecords(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return validationRequest<{ success: boolean; data: Array<Record<string, unknown>> }>(
    `/api/admin/supplier-production-validation/records${qs}`
  );
}

export async function runProductionCapabilityValidation(body: {
  supplierId?: string;
  market?: string;
  channel?: string;
  environment?: string;
  allowLiveRead?: boolean;
  failureInjection?: string;
}) {
  return validationRequest<{ success: boolean; data: Record<string, unknown>; safety: Record<string, unknown> }>(
    "/api/admin/supplier-production-validation/run",
    { method: "POST", body: JSON.stringify(body) }
  );
}
