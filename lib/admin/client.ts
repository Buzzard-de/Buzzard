import type {
  AdminOrder,
  AdminProduct,
  AdminSupplier,
  AdminUser,
  AuditEntry,
  ImportLogEntry,
  SyncJob,
} from "./types";

const TOKEN_KEY = "buzzard_admin_token";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
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
  const data = (await res.json()) as T & { success?: boolean; errorKey?: string };
  if (!res.ok) throw new Error((data as { errorKey?: string }).errorKey || "admin.requestFailed");
  return data;
}

export function saveAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  const data = await request<{ success: boolean; token: string; user: AdminUser }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveAdminToken(data.token);
  return { token: data.token, user: data.user };
}

export async function adminLogout(): Promise<void> {
  try {
    await request("/api/admin/logout", { method: "POST", body: "{}" });
  } finally {
    clearAdminToken();
  }
}

export async function fetchAdminMe(): Promise<AdminUser> {
  const data = await request<{ success: boolean; user: AdminUser }>("/api/admin/me");
  return data.user;
}

export async function fetchAdminProducts(q?: string): Promise<AdminProduct[]> {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const data = await request<{ success: boolean; products: AdminProduct[] }>(`/api/admin/products${qs}`);
  return data.products;
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const data = await request<{ success: boolean; product: AdminProduct }>(`/api/admin/products/${encodeURIComponent(id)}`);
  return data.product;
}

export async function updateAdminProduct(id: string, patch: Partial<AdminProduct>): Promise<AdminProduct> {
  const data = await request<{ success: boolean; product: AdminProduct }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return data.product;
}

export async function setProductStatus(id: string, status: string): Promise<AdminProduct> {
  const data = await request<{ success: boolean; product: AdminProduct }>(
    `/api/admin/products/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
  return data.product;
}

export async function fetchAdminSuppliers(): Promise<{ suppliers: AdminSupplier[]; mappings: unknown[] }> {
  return request("/api/admin/suppliers");
}

export async function runImport(body: {
  supplierId: string;
  format: "json" | "csv" | "manual";
  payload?: unknown;
  csvText?: string;
  mode?: string;
}): Promise<SyncJob> {
  const data = await request<{ success: boolean; job: SyncJob }>("/api/admin/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.job;
}

export async function fetchSyncLogs(): Promise<{ syncJobs: SyncJob[]; importLogs: ImportLogEntry[] }> {
  return request("/api/admin/sync/logs");
}

export async function retryImport(logId: string): Promise<SyncJob> {
  const data = await request<{ success: boolean; job: SyncJob }>("/api/admin/sync/retry", {
    method: "POST",
    body: JSON.stringify({ logId }),
  });
  return data.job;
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const data = await request<{ success: boolean; orders: AdminOrder[] }>("/api/admin/orders");
  return data.orders;
}

export async function updateOrderStatus(orderNumber: string, status: string): Promise<AdminOrder> {
  const data = await request<{ success: boolean; order: AdminOrder }>(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
  return data.order;
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  const data = await request<{ success: boolean; entries: AuditEntry[] }>("/api/admin/audit");
  return data.entries;
}
