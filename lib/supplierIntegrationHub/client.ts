import type {
  SupplierIntegrationHubOverview,
  SupplierIntegrationHubRow,
  SupplierIntegrationHubStatus,
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
  if (!base) throw new Error("supplierIntegrationHub.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "supplierIntegrationHub.requestFailed");
  return data;
}

export function isSupplierIntegrationHubApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchSupplierIntegrationHubStatus(): Promise<SupplierIntegrationHubStatus> {
  const base = apiBase();
  if (!base) throw new Error("supplierIntegrationHub.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("supplierIntegrationHub.requestFailed");
  const data = (await res.json()) as { supplierIntegrationHub?: SupplierIntegrationHubStatus };
  if (!data.supplierIntegrationHub?.enabled) throw new Error("supplierIntegrationHub.disabled");
  return data.supplierIntegrationHub;
}

export async function fetchSupplierIntegrationHubOverview(): Promise<SupplierIntegrationHubOverview> {
  return adminRequest<SupplierIntegrationHubOverview>("/api/admin/supplier-integration-hub/overview");
}

export async function fetchSupplierIntegrationHubSuppliers(): Promise<SupplierIntegrationHubRow[]> {
  return adminRequest<SupplierIntegrationHubRow[]>("/api/supplier-integration-hub/suppliers");
}
