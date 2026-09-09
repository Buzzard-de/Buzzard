import type { ProductSeoByLocale } from "./types";

export function createSeoEntry(
  locale: string,
  slug: string,
  seoTitle?: string,
  seoDescription?: string
): ProductSeoByLocale {
  return { locale, slug, seoTitle, seoDescription };
}

export function getSlugForLocale(seo: ProductSeoByLocale[], locale: string): string | undefined {
  const normalized = locale.toLowerCase();
  const entry =
    seo.find((s) => s.locale.toLowerCase() === normalized) ||
    seo.find((s) => s.locale.split("-")[0].toLowerCase() === normalized.split("-")[0]);
  return entry?.slug;
}

export function validateSeoEntries(seo: ProductSeoByLocale[]): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();
  for (const entry of seo) {
    if (!entry.slug?.trim()) errors.push("SLUG_MISSING");
    if (entry.slug && slugs.has(entry.slug)) errors.push("SLUG_DUPLICATE");
    if (entry.slug) slugs.add(entry.slug);
  }
  return [...new Set(errors)];
}
