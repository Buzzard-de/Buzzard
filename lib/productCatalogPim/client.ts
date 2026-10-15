import { withAdminCredentials } from "@/lib/admin/authTransport";
import type {
  ProductCatalogPimOverview,
  ProductCatalogPimProductRow,
  ProductCatalogPimStatus,
} from "./types";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_BUZZARD_API_URL || "").replace(/\/$/, "");
}


async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error("productCatalogPim.apiUnavailable");
  const res = await fetch(`${base}${path}`, withAdminCredentials(init));
  const data = (await res.json()) as T & { errorKey?: string };
  if (!res.ok) throw new Error(data.errorKey || "productCatalogPim.requestFailed");
  return data;
}

export function isProductCatalogPimApiConfigured(): boolean {
  return Boolean(apiBase());
}

export async function fetchProductCatalogPimStatus(): Promise<ProductCatalogPimStatus> {
  const base = apiBase();
  if (!base) throw new Error("productCatalogPim.apiUnavailable");
  const res = await fetch(`${base}/api/health`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("productCatalogPim.requestFailed");
  const data = (await res.json()) as { productCatalogPim?: ProductCatalogPimStatus };
  if (!data.productCatalogPim?.enabled) throw new Error("productCatalogPim.disabled");
  return data.productCatalogPim;
}

export async function fetchProductCatalogPimOverview(): Promise<ProductCatalogPimOverview> {
  return adminRequest<ProductCatalogPimOverview>("/api/admin/product-catalog-pim/overview");
}

export async function fetchProductCatalogPimProducts(
  search = "",
  status = "",
  category = "",
  brand = ""
): Promise<ProductCatalogPimProductRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  if (brand) params.set("brand", brand);
  const query = params.toString();
  return adminRequest<ProductCatalogPimProductRow[]>(
    `/api/admin/product-catalog-pim/products${query ? `?${query}` : ""}`
  );
}
