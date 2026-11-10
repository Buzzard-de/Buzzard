import type { ProductTechnicalFields, ProductTranslatableFields } from "./types";
import { AUTOMOTIVE_PRESERVE_PATTERNS } from "./types";

export function splitProductFields(product: Record<string, unknown>): {
  technical: Partial<ProductTechnicalFields>;
  translatable: Partial<ProductTranslatableFields>;
} {
  const technical: Partial<ProductTechnicalFields> = {
    sku: String(product.sku ?? product.SKU ?? ""),
    ean: String(product.ean ?? product.EAN ?? product.gtin ?? ""),
    brand: String(product.brand ?? ""),
    technicalData: (product.technicalData as Record<string, string | number>) ?? {},
    compatibility: (product.compatibility as unknown[]) ?? [],
    dimensions: (product.dimensions as Record<string, number>) ?? {},
    weight: Number(product.weight ?? 0),
  };

  const translatable: Partial<ProductTranslatableFields> = {
    productName: String(product.productName ?? product.title ?? product.name ?? ""),
    shortDescription: String(product.shortDescription ?? product.short_desc ?? ""),
    description: String(product.description ?? ""),
    features: Array.isArray(product.features) ? product.features.map(String) : [],
    warnings: Array.isArray(product.warnings) ? product.warnings.map(String) : [],
    seoTitle: String(product.seoTitle ?? product.metaTitle ?? ""),
    seoDescription: String(product.seoDescription ?? product.metaDescription ?? ""),
  };

  return { technical, translatable };
}

export function shouldPreserveAutomotiveValue(value: string): boolean {
  return AUTOMOTIVE_PRESERVE_PATTERNS.some((pattern) => pattern.test(value));
}

export function getProductTranslation(
  translations: Record<string, Partial<ProductTranslatableFields>> | undefined,
  languageCode: string,
  field: keyof ProductTranslatableFields
): string | string[] | undefined {
  if (!translations) return undefined;
  const direct = translations[languageCode]?.[field];
  if (direct) return direct as string | string[];
  if (translations.en?.[field]) return translations.en[field] as string | string[];
  return undefined;
}
