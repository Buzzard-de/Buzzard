import type { BuzzardLocale } from "@/lib/i18n/types";
import type { LocalizedCatalogProduct } from "./types";
import type { PublicProduct, StockStatus } from "@/lib/products/types";

const LOCALE_BY_COUNTRY: Record<string, string> = {
  DE: "de-DE",
  GB: "en-GB",
  FR: "fr-FR",
  NL: "nl-NL",
  PL: "pl-PL",
  TR: "tr-TR",
  RS: "sr-RS",
  BA: "bs-BA",
  AL: "sq-AL",
  MK: "mk-MK",
  BG: "bg-BG",
  RO: "ro-RO",
  GR: "el-GR",
  HR: "hr-HR",
  HU: "hu-HU",
  CZ: "cs-CZ",
  SK: "sk-SK",
  SI: "sl-SI",
  IT: "it-IT",
  ES: "es-ES",
};

const LOCALE_BY_UI: Record<BuzzardLocale, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  ar: "en-GB",
};

export function resolveApiLocale(uiLocale: BuzzardLocale, countryCode: string): string {
  return LOCALE_BY_COUNTRY[countryCode.toUpperCase()] || LOCALE_BY_UI[uiLocale] || "de-DE";
}

function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return "out_of_stock";
  if (stock < 10) return "low_stock";
  return "in_stock";
}

export function mapLocalizedProductToPublic(product: LocalizedCatalogProduct): PublicProduct {
  const slug = product.slug.replace(/^\/+|\/+$/g, "");
  const images = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.images?.map((img) => img.url).filter(Boolean) ?? []),
  ];

  return {
    id: `localized-${product.id}`,
    sku: product.sku,
    eanGtin: "",
    brand: "Buzzard",
    name: product.name,
    shortDescription: (product.description || "").slice(0, 160),
    description: product.description || "",
    categoryId: product.category_slug || product.category || "localized",
    categoryIds: [product.category_slug || product.category || "localized"],
    images,
    documents: [],
    attributes: {
      source: "localization-api",
      locale: product.locale,
      country: product.country,
      currency: product.currency,
      category: product.category || "",
    },
    variants: [],
    price: product.price,
    vatRate: 19,
    stock: product.stock,
    stockStatus: stockStatus(product.stock),
    shipping: {
      weight_kg: 1,
      length_cm: 20,
      width_cm: 20,
      height_cm: 10,
      class: "standard",
    },
    seo: {
      slug,
      title: product.seo_title || product.name,
      description: product.seo_description || product.description || product.name,
    },
    buyNowEnabled: true,
    url: `/produkt/${slug}/`,
  };
}
