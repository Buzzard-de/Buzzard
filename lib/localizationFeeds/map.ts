import type { BuzzardLanguageCode } from "@/lib/i18n/types";
import { LOCALE_TAG_MAP } from "@/lib/i18n/types";
import type { LocalizedCatalogProduct } from "./types";
import type { PublicProduct, StockStatus } from "@/lib/products/types";

const LOCALE_BY_UI: Record<BuzzardLanguageCode, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  ar: "ar-SA",
  fr: "fr-FR",
  nl: "nl-NL",
  bg: "bg-BG",
  hr: "hr-HR",
  el: "el-GR",
  cs: "cs-CZ",
  da: "da-DK",
  et: "et-EE",
  fi: "fi-FI",
  hu: "hu-HU",
  it: "it-IT",
  lv: "lv-LV",
  lt: "lt-LT",
  lb: "lb-LU",
  mt: "mt-MT",
  pl: "pl-PL",
  pt: "pt-PT",
  ro: "ro-RO",
  sk: "sk-SK",
  sl: "sl-SI",
  es: "es-ES",
  ca: "ca-ES",
  eu: "eu-ES",
  gl: "gl-ES",
  sv: "sv-SE",
  ga: "ga-IE",
};

export function resolveApiLocale(uiLocale: BuzzardLanguageCode, countryCode: string): string {
  const country = countryCode.toUpperCase();
  const byCountry = Object.entries(LOCALE_TAG_MAP).find(([tag, lang]) => tag.endsWith(`-${country}`) && lang === uiLocale)?.[0];
  if (byCountry) return byCountry;
  return LOCALE_BY_UI[uiLocale] || "de-DE";
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
