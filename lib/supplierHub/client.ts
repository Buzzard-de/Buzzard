import type {
  SupplierHubCompatibility,
  SupplierHubMargin,
  SupplierHubStatus,
  SupplierHubSupplier,
  SupplierHubSyncResult,
  SupplierHubSyncRun,
  SupplierHubVehicle,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const adminToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_admin_token") : null;
  const accountToken =
    typeof window !== "undefined" ? sessionStorage.getItem("buzzard_account_token") : null;
  const token = adminToken || accountToken;
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("supplierHub.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "supplierHub.requestFailed");
  return data;
}

export function isSupplierHubApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchSupplierHubStatus(): Promise<SupplierHubStatus> {
  const base = apiBase();
  if (!base) throw new Error("supplierHub.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("supplierHub.requestFailed");
  const data = (await res.json()) as { supplierHub?: SupplierHubStatus };
  if (!data.supplierHub?.enabled) throw new Error("supplierHub.disabled");
  return data.supplierHub;
}

export async function fetchSuppliers(): Promise<SupplierHubSupplier[]> {
  return request<SupplierHubSupplier[]>("/api/admin/supplier-hub/suppliers");
}

export async function createSupplier(body: {
  code: string;
  name: string;
  country?: string;
  feedType?: string;
  feedUrl?: string;
  dropship?: boolean;
}): Promise<SupplierHubSupplier> {
  return request<SupplierHubSupplier>("/api/admin/supplier-hub/suppliers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function syncSupplierFeed(
  supplierId: number,
  body: { format?: "json" | "xml"; payload?: unknown }
): Promise<SupplierHubSyncResult> {
  return request<SupplierHubSyncResult>(`/api/admin/supplier-hub/suppliers/${supplierId}/sync`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchSyncRuns(limit = 20): Promise<SupplierHubSyncRun[]> {
  return request<SupplierHubSyncRun[]>(`/api/admin/supplier-hub/sync-runs?limit=${limit}`);
}

export async function fetchMargins(): Promise<SupplierHubMargin[]> {
  return request<SupplierHubMargin[]>("/api/admin/supplier-hub/margins");
}

export async function fetchVehicles(filters?: { make?: string; model?: string }): Promise<SupplierHubVehicle[]> {
  const base = apiBase();
  if (!base) throw new Error("supplierHub.apiUnavailable");
  const url = new URL(`${base}/api/vehicles`);
  if (filters?.make) url.searchParams.set("make", filters.make);
  if (filters?.model) url.searchParams.set("model", filters.model);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("supplierHub.requestFailed");
  return (await res.json()) as SupplierHubVehicle[];
}

export async function seedDemoVehicles(): Promise<{ ok: boolean; count: number }> {
  return request<{ ok: boolean; count: number }>("/api/vehicles/seed", { method: "POST", body: "{}" });
}

export async function linkTecDocCompatibility(body: {
  productSku: string;
  vehicleId: number;
}): Promise<{ productSku: string; status: string; licensed: boolean }> {
  return request("/api/tecdoc/compatibility/link", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchTecDocCompatibility(sku: string): Promise<SupplierHubCompatibility[]> {
  const base = apiBase();
  if (!base) throw new Error("supplierHub.apiUnavailable");
  const res = await fetch(`${base}/api/tecdoc/compatibility/${encodeURIComponent(sku)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("supplierHub.requestFailed");
  return (await res.json()) as SupplierHubCompatibility[];
}
