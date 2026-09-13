import { getAdminToken } from "@/lib/admin/client";

export interface SupplierFoundationRow {
  supplierId: string;
  name: string;
  country: string;
  integrationTypes: string;
  status: string;
  capabilities: string;
  orderCapabilities: string;
  supportedMarkets: string[];
  lastSync: string;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  syncStatus: string;
  health: string;
  reliabilityScore: number;
  products: number;
  errors: number;
  credentialsConfigured: boolean;
}

export interface SupplierFoundationDashboard {
  totalSuppliers: number;
  activeSuppliers: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  disabled: number;
  syncing: number;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  productsProcessed: number;
  offersUpdated: number;
  stockUpdated: number;
  priceUpdated: number;
}

export interface SupplierFoundationDetail {
  general: {
    supplierId: string;
    name: string;
    country: string;
    connector: string;
    environment?: string;
    active: boolean;
    status: string;
  };
  connection?: {
    status: string;
    latencyMs: number;
    message: string;
    lastChecked: string;
    networkEnabled: boolean;
  };
  markets: string[];
  capabilities: Record<string, boolean | undefined>;
  sync: Record<string, unknown>;
  health: Record<string, unknown>;
  audit: Array<Record<string, unknown>>;
  credentialsConfigured: boolean;
  orderSandbox?: {
    realSupplierOrderNetwork: string;
    supplierOrderNetworkEnabled?: boolean;
    lastSandboxOrder?: {
      supplierOrderId: string;
      buzzardOrderId: string;
      status: string;
      idempotencyKey: string;
      latencyMs: number;
      error?: string;
      updatedAt: string;
    } | null;
  };
}

export interface SupplierConnectionTestResult {
  status: string;
  latencyMs: number;
  connector: string;
  environment: string;
  message: string;
  checkedAt: string;
}

export interface SupplierDryRunTestSyncResult {
  ok: boolean;
  dryRun: true;
  supplierId: string;
  productsFound: number;
  valid: number;
  invalid: number;
  duplicates: number;
  stockRecords: number;
  priceRecords: number;
  warnings: string[];
  errors: Array<{ code: string; message: string; record?: string }>;
  dataQuality?: Record<string, number>;
  source?: "mock" | "live" | "fixture";
  completedAt: string;
}

export interface SupplierLiveReadSyncResult {
  liveRead: true;
  status: string;
  guardReasons?: string[];
  productsFetched: number;
  productsCreated: number;
  productsUpdated: number;
  stockUpdates: number;
  priceUpdates: number;
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

async function foundationRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("admin.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { success?: boolean; errorCode?: string; errorKey?: string };
  if (!res.ok) {
    throw new Error(data.errorCode || data.errorKey || "admin.requestFailed");
  }
  return data;
}

export async function fetchSupplierFoundationOverview() {
  return foundationRequest<{
    success: boolean;
    data: SupplierFoundationRow[];
    dashboard: SupplierFoundationDashboard;
  }>("/api/admin/supplier-foundation/overview");
}

export async function fetchSupplierFoundationDetail(supplierId: string) {
  return foundationRequest<{ success: boolean; data: SupplierFoundationDetail }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}`
  );
}

export async function triggerSupplierFoundationSync(
  supplierId: string,
  jobType: "FULL" | "INCREMENTAL" | "STOCK_ONLY" | "PRICE_ONLY" = "FULL"
) {
  return foundationRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/sync`,
    { method: "POST", body: JSON.stringify({ jobType }) }
  );
}

export async function setSupplierFoundationEnabled(supplierId: string, enabled: boolean) {
  const path = enabled ? "enable" : "disable";
  return foundationRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/${path}`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function resetSupplierFoundationCursor(supplierId: string, syncMode = "incremental") {
  return foundationRequest<{ success: boolean; data: Record<string, unknown> }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/cursor/reset`,
    { method: "POST", body: JSON.stringify({ confirm: true, syncMode }) }
  );
}

export async function runSupplierFoundationConnectionTest(supplierId: string) {
  return foundationRequest<{ success: boolean; data: SupplierConnectionTestResult }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/connection-test`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function runSupplierFoundationTestSync(supplierId: string) {
  return foundationRequest<{ success: boolean; data: SupplierDryRunTestSyncResult }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/test-sync`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function runSupplierFoundationLiveReadSync(
  supplierId: string,
  jobType: "FULL" | "INCREMENTAL" = "FULL"
) {
  return foundationRequest<{ success: boolean; data: SupplierLiveReadSyncResult }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/live-read-sync`,
    { method: "POST", body: JSON.stringify({ jobType }) }
  );
}

export async function fetchSupplierOrderSandboxSummary(supplierId: string) {
  return foundationRequest<{
    success: boolean;
    data: {
      realSupplierOrderNetwork: string;
      supplierOrderNetworkEnabled: boolean;
      lastSandboxOrder: SupplierFoundationDetail["orderSandbox"] extends { lastSandboxOrder?: infer T }
        ? T
        : unknown;
      networkSafety: Record<string, unknown>;
    };
  }>(`/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/order-sandbox`);
}

export async function runSupplierOrderSandboxTest(
  supplierId: string,
  body?: {
    orderId?: string;
    lines?: Array<{ supplierSku: string; quantity: number; unitPrice: number }>;
    shippingAddress?: Record<string, string>;
  }
) {
  return foundationRequest<{ success: boolean; data: Record<string, unknown>; payload?: Record<string, unknown> }>(
    `/api/admin/supplier-foundation/${encodeURIComponent(supplierId)}/order-sandbox-test`,
    { method: "POST", body: JSON.stringify(body || {}) }
  );
}
