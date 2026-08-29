import type { StorefrontListResult, StorefrontProduct } from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("storefront.apiUnavailable");
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  const data = (await res.json()) as T & { success?: boolean };
  if (!res.ok) throw new Error("storefront.requestFailed");
  return data;
}

export async function fetchStorefrontProducts(params?: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  sort?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}): Promise<StorefrontListResult> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category) qs.set("category", params.category);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.sort) qs.set("sort", params.sort);
  if (params?.brand) qs.set("brand", params.brand);
  if (params?.minPrice != null) qs.set("minPrice", String(params.minPrice));
  if (params?.maxPrice != null) qs.set("maxPrice", String(params.maxPrice));
  if (params?.inStock) qs.set("inStock", "1");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const data = await fetchJson<StorefrontListResult & { success: boolean }>(`/api/catalog/products${suffix}`);
  return {
    items: data.items,
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages: data.totalPages,
    facets: data.facets,
    catalogMode: data.catalogMode,
  };
}

export async function fetchStorefrontProduct(idOrSlug: string): Promise<StorefrontProduct | null> {
  try {
    const byId = await fetchJson<{ success: boolean; product: StorefrontProduct }>(
      `/api/catalog/products/${encodeURIComponent(idOrSlug)}`
    );
    return byId.product;
  } catch {
    try {
      const bySlug = await fetchJson<{ success: boolean; product: StorefrontProduct }>(
        `/api/catalog/products/slug/${encodeURIComponent(idOrSlug)}`
      );
      return bySlug.product;
    } catch {
      return null;
    }
  }
}

export async function searchStorefrontProducts(q: string, page = 1): Promise<StorefrontListResult> {
  const qs = new URLSearchParams({ q, page: String(page) });
  const data = await fetchJson<StorefrontListResult & { success: boolean }>(`/api/catalog/search?${qs.toString()}`);
  return data;
}
