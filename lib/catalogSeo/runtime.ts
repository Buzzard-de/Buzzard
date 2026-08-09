import { isCatalogSeoEnabled } from "@/lib/api/config";
import { fetchCatalogProductBySlug, fetchCatalogProducts } from "./client";
import { mapCatalogProductToPublic } from "./map";
import type { PublicProduct } from "@/lib/products/types";

export function isLiveCatalogEnabled(): boolean {
  return isCatalogSeoEnabled();
}

export async function loadLiveCatalogProducts(filters?: {
  q?: string;
  category?: string;
  vehicleId?: number;
}): Promise<PublicProduct[]> {
  if (!isLiveCatalogEnabled()) return [];
  const rows = await fetchCatalogProducts(filters);
  return rows.map(mapCatalogProductToPublic);
}

export async function loadLiveCatalogProductBySlug(slug: string): Promise<PublicProduct | null> {
  if (!isLiveCatalogEnabled()) return null;
  try {
    const row = await fetchCatalogProductBySlug(slug);
    return mapCatalogProductToPublic(row);
  } catch {
    return null;
  }
}

export function mergeCatalogProducts(staticItems: PublicProduct[], liveItems: PublicProduct[]): PublicProduct[] {
  const bySlug = new Map<string, PublicProduct>();
  for (const item of staticItems) {
    bySlug.set(item.seo.slug, item);
  }
  for (const item of liveItems) {
    bySlug.set(item.seo.slug, item);
  }
  return [...bySlug.values()];
}
