import type {
  CatalogCategory,
  CatalogProduct,
  CatalogProductImage,
  CatalogSeoStatus,
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
  if (!base) throw new Error("catalogSeo.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "catalogSeo.requestFailed");
  return data;
}

export function isCatalogSeoApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchCatalogSeoStatus(): Promise<CatalogSeoStatus> {
  const base = apiBase();
  if (!base) throw new Error("catalogSeo.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("catalogSeo.requestFailed");
  const data = (await res.json()) as { catalogSeo?: CatalogSeoStatus };
  if (!data.catalogSeo?.enabled) throw new Error("catalogSeo.disabled");
  return data.catalogSeo;
}

export async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  return request<CatalogCategory[]>("/api/catalog/categories");
}

export async function fetchCatalogProducts(filters?: {
  q?: string;
  category?: string;
  vehicleId?: number;
}): Promise<CatalogProduct[]> {
  const base = apiBase();
  if (!base) throw new Error("catalogSeo.apiUnavailable");
  const url = new URL(`${base}/api/catalog/products`);
  if (filters?.q) url.searchParams.set("q", filters.q);
  if (filters?.category) url.searchParams.set("category", filters.category);
  if (filters?.vehicleId) url.searchParams.set("vehicleId", String(filters.vehicleId));
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("catalogSeo.requestFailed");
  return (await res.json()) as CatalogProduct[];
}

export async function fetchCatalogProductBySlug(slug: string): Promise<CatalogProduct> {
  const base = apiBase();
  if (!base) throw new Error("catalogSeo.apiUnavailable");
  const res = await fetch(`${base}/api/catalog/products/slug/${encodeURIComponent(slug)}`, {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json()) as CatalogProduct & { error?: string };
  if (!res.ok) throw new Error(data.error || "catalogSeo.requestFailed");
  return data;
}

export async function fetchAdminCatalogProducts(): Promise<CatalogProduct[]> {
  return request<CatalogProduct[]>("/api/admin/catalog/products");
}

export async function createCatalogProduct(body: Record<string, unknown>): Promise<CatalogProduct> {
  return request<CatalogProduct>("/api/admin/catalog/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCatalogProduct(
  id: number,
  body: Record<string, unknown>
): Promise<CatalogProduct> {
  return request<CatalogProduct>(`/api/admin/catalog/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function bulkUpdateCatalogPrices(margin = 0.3): Promise<{ updated: number; margin: number }> {
  return request<{ updated: number; margin: number }>("/api/admin/catalog/products/bulk-price", {
    method: "POST",
    body: JSON.stringify({ margin }),
  });
}

export async function addCatalogProductImage(
  productId: number,
  body: { url: string; altText?: string; sortOrder?: number }
): Promise<CatalogProductImage> {
  return request<CatalogProductImage>(`/api/admin/catalog/products/${productId}/images`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchProductJsonLd(id: number): Promise<Record<string, unknown>> {
  const base = apiBase();
  if (!base) throw new Error("catalogSeo.apiUnavailable");
  const res = await fetch(`${base}/api/catalog/products/${id}/jsonld`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("catalogSeo.requestFailed");
  return (await res.json()) as Record<string, unknown>;
}
