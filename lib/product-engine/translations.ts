import type { ProductTranslation } from "./types";
import { splitProductFields } from "@/lib/i18n/international/productTranslation";

export function createProductTranslation(
  locale: string,
  fields: Partial<Omit<ProductTranslation, "locale">>
): ProductTranslation {
  return {
    locale,
    name: fields.name || "",
    shortDescription: fields.shortDescription,
    description: fields.description,
    features: fields.features,
    warnings: fields.warnings,
    seoTitle: fields.seoTitle,
    seoDescription: fields.seoDescription,
    slug: fields.slug,
  };
}

export function getTranslationForLocale(
  translations: ProductTranslation[],
  locale: string
): ProductTranslation | undefined {
  const normalized = locale.toLowerCase();
  return (
    translations.find((t) => t.locale.toLowerCase() === normalized) ||
    translations.find((t) => t.locale.split("-")[0].toLowerCase() === normalized.split("-")[0])
  );
}

export function splitRawProductFields(raw: Record<string, unknown>) {
  return splitProductFields(raw);
}

export function hasRequiredTranslation(translations: ProductTranslation[], locale = "de"): boolean {
  const t = getTranslationForLocale(translations, locale);
  return Boolean(t?.name?.trim());
}
