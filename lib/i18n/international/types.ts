import type globalCountries from "@/data/global/global_countries_35.json";

export type GlobalCountryEntry = (typeof globalCountries)[number];

export interface LocaleVariant {
  languageCode: string;
  locale: string;
  nativeName: string;
  isDefault?: boolean;
  uiExtension?: boolean;
}

export interface LanguageOption {
  languageCode: string;
  nativeName: string;
  locale: string;
  countryCode: string;
  countryName: string;
  direction: "ltr" | "rtl";
  uiReady: boolean;
}

export interface ResolvedLocale {
  countryCode: string;
  languageCode: string;
  locale: string;
  currency: string;
  timezone: string;
  direction: "ltr" | "rtl";
  source: string;
}

/** Canonical translation namespaces — identical structure across all languages. */
export const TRANSLATION_NAMESPACES = [
  "common",
  "navigation",
  "header",
  "footer",
  "home",
  "categories",
  "search",
  "product",
  "cart",
  "checkout",
  "payment",
  "shipping",
  "returns",
  "account",
  "login",
  "register",
  "wishlist",
  "orders",
  "customerService",
  "errors",
  "validation",
  "legal",
  "privacy",
  "cookies",
  "vehicleSelector",
  "automotive",
  "tires",
  "brakes",
  "engineOil",
  "inventory",
  "supplier",
  "marketplace",
] as const;

export type TranslationNamespace = (typeof TRANSLATION_NAMESPACES)[number];

/** Technical automotive values that must never be auto-translated. */
export const AUTOMOTIVE_PRESERVE_PATTERNS = [
  /\d{3}\/\d{2}\s*R\d{2}/i,
  /\dW-\d+/i,
  /\b(API|ACEA|OEM|EAN|SKU|kW|PS|Nm)\b/i,
] as const;

export interface ProductTranslatableFields {
  productName: string;
  shortDescription: string;
  description: string;
  features: string[];
  warnings: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface ProductTechnicalFields {
  sku: string;
  ean: string;
  brand: string;
  technicalData: Record<string, string | number>;
  compatibility: unknown[];
  dimensions: Record<string, number>;
  weight: number;
}

export interface AdminMarketRow {
  country: string;
  countryName: string;
  language: string;
  nativeName: string;
  locale: string;
  currency: string;
  status: "ACTIVE" | "PREPARED" | "DISABLED";
}
