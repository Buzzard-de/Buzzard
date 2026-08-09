import type {
  PimBrand,
  PimCatalogStatus,
  PimCategory,
  PimCompletenessStats,
  PimImportJob,
  PimProduct,
  PimProductDetail,
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
  if (!base) throw new Error("pimCatalog.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers || {}) },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "pimCatalog.requestFailed");
  return data;
}

export function isPimCatalogApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchPimCatalogStatus(): Promise<PimCatalogStatus> {
  const base = apiBase();
  if (!base) throw new Error("pimCatalog.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("pimCatalog.requestFailed");
  const data = (await res.json()) as { pimCatalog?: PimCatalogStatus };
  if (!data.pimCatalog?.enabled) throw new Error("pimCatalog.disabled");
  return data.pimCatalog;
}

export async function fetchPimCategories(): Promise<PimCategory[]> {
  const base = apiBase();
  if (!base) return [];
  const res = await fetch(`${base}/api/pim-catalog/categories`, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  return (await res.json()) as PimCategory[];
}

export async function fetchPimBrands(): Promise<PimBrand[]> {
  const base = apiBase();
  if (!base) return [];
  const res = await fetch(`${base}/api/pim-catalog/brands`, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  return (await res.json()) as PimBrand[];
}

export async function fetchPimProducts(search?: string, status?: string): Promise<PimProduct[]> {
  const base = apiBase();
  if (!base) return [];
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const qs = params.toString();
  const res = await fetch(`${base}/api/pim-catalog/products${qs ? `?${qs}` : ""}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return (await res.json()) as PimProduct[];
}

export async function fetchPimProductDetail(sku: string): Promise<PimProductDetail | null> {
  const base = apiBase();
  if (!base) return null;
  const res = await fetch(`${base}/api/pim-catalog/products/${encodeURIComponent(sku)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as PimProductDetail;
}

export async function fetchPimCompletenessStats(): Promise<PimCompletenessStats> {
  return adminRequest<PimCompletenessStats>("/api/admin/pim-catalog/completeness");
}

export async function fetchPimImportJobs(): Promise<PimImportJob[]> {
  return adminRequest<PimImportJob[]>("/api/admin/pim-catalog/import-jobs");
}

export async function createPimProduct(body: {
  sku: string;
  brandId?: number;
  categoryId?: number;
  ean?: string;
  price?: number;
  cost?: number;
  stock?: number;
  status?: string;
}): Promise<PimProduct> {
  return adminRequest<PimProduct>("/api/admin/pim-catalog/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePimProduct(
  id: number,
  body: Partial<{
    brandId: number;
    categoryId: number;
    status: string;
    price: number;
    stock: number;
  }>
): Promise<PimProduct> {
  return adminRequest<PimProduct>(`/api/admin/pim-catalog/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function queuePimImport(body: {
  sourceType?: string;
  sourceName?: string;
  itemsTotal?: number;
}): Promise<PimImportJob> {
  return adminRequest<PimImportJob>("/api/admin/pim-catalog/import", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
