import type {
  AdminOrder,
  AdminProduct,
  AdminSupplier,
  AdminUser,
  AuditEntry,
  ImportLogEntry,
  SyncJob,
} from "./types";
import type {
  AdminLoginResult,
  AdminTwoFactorStatus,
  LockoutEntry,
  SecurityEvent,
  SecurityOverview,
} from "./securityTypes";
import { isSqliteStoreEnabled } from "@/lib/store/config";
import {
  mapStoreAdminOrder,
  mapStoreAdminUser,
  mapStoreProduct,
  storeAdminGetProduct,
  storeAdminOrders,
  storeAdminProducts,
  storeAdminUpdateOrderStatus,
  storeAdminUpdateProduct,
  storeLogin,
  storeLogout,
  storeMe,
} from "@/lib/store";

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

export async function adminLogin(
  email: string,
  password: string,
  totpCode?: string,
  challengeToken?: string
): Promise<AdminLoginResult> {
  if (isSqliteStoreEnabled()) {
    const data = await storeLogin(email, password);
    if (data.user.role !== "admin") {
      clearAdminToken();
      throw new Error("admin.auth.invalid");
    }
    saveAdminToken(data.token);
    return { token: data.token, user: mapStoreAdminUser(data.user) };
  }

  if (challengeToken && totpCode) {
    const data = await request<{
      success: boolean;
      token: string;
      user: AdminUser;
    }>("/api/admin/login/2fa", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code: totpCode }),
    });
    saveAdminToken(data.token);
    return { token: data.token, user: data.user };
  }

  const data = await request<{
    success: boolean;
    token?: string;
    user: AdminUser;
    requires2FA?: boolean;
    challengeToken?: string;
  }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (data.requires2FA && data.challengeToken) {
    return {
      requires2FA: true,
      challengeToken: data.challengeToken,
      user: data.user,
    };
  }

  if (!data.token) throw new Error("admin.auth.invalid");
  saveAdminToken(data.token);
  return { token: data.token, user: data.user };
}

export async function adminLogout(): Promise<void> {
  if (isSqliteStoreEnabled()) {
    await storeLogout();
    return;
  }
  try {
    await request("/api/admin/logout", { method: "POST", body: "{}" });
  } finally {
    clearAdminToken();
  }
}

export async function fetchAdminMe(): Promise<AdminUser> {
  if (isSqliteStoreEnabled()) {
    const user = await storeMe();
    if (user.role !== "admin") throw new Error("admin.auth.required");
    return mapStoreAdminUser(user);
  }
  const data = await request<{ success: boolean; user: AdminUser }>("/api/admin/me");
  return data.user;
}

export async function fetchAdminProducts(q?: string): Promise<AdminProduct[]> {
  if (isSqliteStoreEnabled()) {
    const products = await storeAdminProducts();
    const filtered = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.sku.toLowerCase().includes(q.toLowerCase())
        )
      : products;
    return filtered.map(mapStoreProduct);
  }
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  const data = await request<{ success: boolean; products: AdminProduct[] }>(`/api/admin/products${qs}`);
  return data.products;
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  if (isSqliteStoreEnabled()) {
    const product = await storeAdminGetProduct(Number(id));
    return mapStoreProduct(product);
  }
  const data = await request<{ success: boolean; product: AdminProduct }>(`/api/admin/products/${encodeURIComponent(id)}`);
  return data.product;
}

function mapAdminPatchToStore(patch: Partial<AdminProduct>) {
  return {
    name: patch.name,
    stock: patch.stock,
    price_eur: patch.price?.amount,
    active: patch.status ? patch.status === "active" : undefined,
  };
}

export async function updateAdminProduct(id: string, patch: Partial<AdminProduct>): Promise<AdminProduct> {
  if (isSqliteStoreEnabled()) {
    const product = await storeAdminUpdateProduct(Number(id), mapAdminPatchToStore(patch));
    return mapStoreProduct(product);
  }
  const data = await request<{ success: boolean; product: AdminProduct }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  return data.product;
}

export async function setProductStatus(id: string, status: string): Promise<AdminProduct> {
  if (isSqliteStoreEnabled()) {
    const product = await storeAdminUpdateProduct(Number(id), { active: status === "active" });
    return mapStoreProduct(product);
  }
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
  if (isSqliteStoreEnabled()) {
    const orders = await storeAdminOrders();
    return orders.map(mapStoreAdminOrder);
  }
  const data = await request<{ success: boolean; orders: AdminOrder[] }>("/api/admin/orders");
  return data.orders;
}

export async function updateOrderStatus(orderNumber: string, status: string): Promise<AdminOrder> {
  if (isSqliteStoreEnabled()) {
    const order = await storeAdminUpdateOrderStatus(orderNumber, status);
    return mapStoreAdminOrder(order);
  }
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

export async function fetchSecurityDashboard(params?: {
  severity?: string;
  type?: string;
  user?: string;
  q?: string;
  page?: number;
}): Promise<{
  events: SecurityEvent[];
  overview: SecurityOverview;
  lockouts: LockoutEntry[];
  pagination?: import("./securityTypes").SecurityPagination;
}> {
  const qs = new URLSearchParams();
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.type) qs.set("type", params.type);
  if (params?.user) qs.set("user", params.user);
  if (params?.q) qs.set("q", params.q);
  if (params?.page) qs.set("page", String(params.page));
  qs.set("limit", "50");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await request<{
    success: boolean;
    events: SecurityEvent[];
    overview: SecurityOverview;
    lockouts: LockoutEntry[];
    pagination?: import("./securityTypes").SecurityPagination;
  }>(`/api/admin/security/events${suffix}`);
  return {
    events: data.events,
    overview: data.overview,
    lockouts: data.lockouts,
    pagination: data.pagination,
  };
}

export async function fetchAdminSessions(): Promise<
  Array<{
    sessionId: string;
    userId: string;
    email: string;
    role: string;
    createdAt: string;
    expiresAt: string;
    ip: string | null;
    userAgent: string | null;
  }>
> {
  const data = await request<{ success: boolean; sessions: Array<Record<string, string>> }>(
    "/api/admin/sessions"
  );
  return data.sessions as Array<{
    sessionId: string;
    userId: string;
    email: string;
    role: string;
    createdAt: string;
    expiresAt: string;
    ip: string | null;
    userAgent: string | null;
  }>;
}

export async function revokeAdminSession(sessionId: string): Promise<void> {
  await request(`/api/admin/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
}

export async function fetchAdminTwoFactorStatus(): Promise<AdminTwoFactorStatus> {
  const data = await request<{ success: boolean; enabled: boolean; enabledAt: string | null }>(
    "/api/admin/security/2fa/status"
  );
  return { enabled: data.enabled, enabledAt: data.enabledAt };
}

export async function setupAdminTwoFactor(): Promise<{ secret: string; otpauthUri: string }> {
  const data = await request<{ success: boolean; secret: string; otpauthUri: string }>(
    "/api/admin/security/2fa/setup",
    { method: "POST", body: "{}" }
  );
  return { secret: data.secret, otpauthUri: data.otpauthUri };
}

export async function enableAdminTwoFactor(code: string): Promise<void> {
  await request("/api/admin/security/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function disableAdminTwoFactor(password: string, code: string): Promise<void> {
  await request("/api/admin/security/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ password, code }),
  });
}
