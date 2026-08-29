import { isApiConfigured } from "@/lib/api/config";
import { fetchStorefrontProduct, fetchStorefrontProducts } from "./client";
import { mapStorefrontToPublic } from "./map";
import type { PublicProduct } from "@/lib/products/types";

export function isPimStorefrontEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PIM_STOREFRONT === "0") return false;
  if (process.env.NEXT_PUBLIC_PIM_STOREFRONT === "1") return isApiConfigured();
  return isApiConfigured();
}

export async function loadPimStorefrontProducts(filters?: {
  q?: string;
  category?: string;
  page?: number;
  sort?: string;
}): Promise<{ items: PublicProduct[]; total: number; page: number; totalPages: number; catalogMode: boolean }> {
  if (!isPimStorefrontEnabled()) {
    return { items: [], total: 0, page: 1, totalPages: 0, catalogMode: true };
  }
  const result = await fetchStorefrontProducts(filters);
  return {
    items: result.items.map(mapStorefrontToPublic),
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    catalogMode: result.catalogMode ?? true,
  };
}

export async function loadPimStorefrontProductBySlug(slug: string): Promise<PublicProduct | null> {
  if (!isPimStorefrontEnabled()) return null;
  const product = await fetchStorefrontProduct(slug);
  return product ? mapStorefrontToPublic(product) : null;
}

export function mergeStorefrontProducts(staticItems: PublicProduct[], liveItems: PublicProduct[]): PublicProduct[] {
  const bySlug = new Map<string, PublicProduct>();
  for (const item of staticItems) bySlug.set(item.seo.slug, item);
  for (const item of liveItems) bySlug.set(item.seo.slug, item);
  return [...bySlug.values()];
}
