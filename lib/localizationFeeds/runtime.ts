import { isLocalizationFeedsEnabled } from "@/lib/api/config";
import type { BuzzardLocale } from "@/lib/i18n/types";
import { fetchLocalizedCatalog, fetchLocalizedProductBySlug } from "./client";
import { mapLocalizedProductToPublic, resolveApiLocale } from "./map";
import type { PublicProduct } from "@/lib/products/types";

export function isLiveLocalizationEnabled(): boolean {
  return isLocalizationFeedsEnabled();
}

export async function loadLocalizedCatalogProducts(options: {
  uiLocale: BuzzardLocale;
  countryCode: string;
  currency?: string;
  q?: string;
  category?: string;
  vehicleId?: number;
}): Promise<PublicProduct[]> {
  if (!isLiveLocalizationEnabled()) return [];
  const locale = resolveApiLocale(options.uiLocale, options.countryCode);
  const rows = await fetchLocalizedCatalog({
    locale,
    country: options.countryCode,
    currency: options.currency,
    q: options.q,
    category: options.category,
    vehicleId: options.vehicleId,
  });
  return rows.map(mapLocalizedProductToPublic);
}

export async function loadLocalizedProductBySlug(
  slug: string,
  uiLocale: BuzzardLocale,
  countryCode: string
): Promise<PublicProduct | null> {
  if (!isLiveLocalizationEnabled()) return null;
  try {
    const locale = resolveApiLocale(uiLocale, countryCode);
    const row = await fetchLocalizedProductBySlug(slug, locale);
    return mapLocalizedProductToPublic(row);
  } catch {
    return null;
  }
}

export function mergeLocalizedProducts(staticItems: PublicProduct[], liveItems: PublicProduct[]): PublicProduct[] {
  const bySlug = new Map<string, PublicProduct>();
  for (const item of staticItems) bySlug.set(item.seo.slug, item);
  for (const item of liveItems) bySlug.set(item.seo.slug, item);
  return [...bySlug.values()];
}
