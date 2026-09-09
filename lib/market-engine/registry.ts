import countriesData from "@/data/global/global_countries_35.json";
import marketOverlay from "@/data/global/market_country_overlay.json";
import engineExtensions from "@/data/global/market_engine_extensions.json";
import { getCountryConfig, REQUIRED_MARKET_COUNT } from "@/lib/i18n/international/config";
import type { GlobalCountryEntry, LocaleVariant } from "@/lib/i18n/international/types";
import type {
  MarketConfig,
  MarketFeatureFlags,
  MarketStatus,
  MarketplaceCapability,
  VatRules,
} from "./types";

type OverlayEntry = {
  taxRate: number;
  taxModel: string;
  rtl: boolean;
};

const extensions = engineExtensions as {
  shippingRegions: Record<string, string>;
  paymentRegions: Record<string, string>;
  legalRegions: Record<string, string>;
  supplierRegions: Record<string, string>;
  returnRegions: Record<string, string>;
  marketStatus: Record<string, MarketStatus>;
  defaultMarketStatus: MarketStatus;
  featureFlags: Record<string, Partial<MarketFeatureFlags>>;
  defaultFeatureFlags: MarketFeatureFlags;
  marketplaces: Record<string, MarketplaceCapability[]>;
  paymentCapabilities: Record<string, string[]>;
  shippingCapabilities: string[];
};

const overlayByCode = marketOverlay as Record<string, OverlayEntry>;
const DEFAULT_COUNTRY = "DE";

/** EU member states among Buzzard's 35 markets. */
export const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

const marketByCode = new Map<string, MarketConfig>();

function resolveFeatureFlags(countryCode: string): MarketFeatureFlags {
  const defaults = extensions.defaultFeatureFlags;
  const overrides = extensions.featureFlags[countryCode] ?? {};
  return { ...defaults, ...overrides };
}

function resolveMarketStatus(country: GlobalCountryEntry): MarketStatus {
  if (country.enabled === false) return "DISABLED";
  return extensions.marketStatus[country.countryCode] ?? extensions.defaultMarketStatus;
}

function buildVatRules(countryCode: string): VatRules {
  const overlay = overlayByCode[countryCode];
  return {
    standardRate: overlay?.taxRate ?? 0.2,
    pricesIncludeVat: true,
    taxModel: overlay?.taxModel ?? "VAT",
  };
}

function buildMarketConfig(country: GlobalCountryEntry): MarketConfig {
  const code = country.countryCode;
  const variants = (country as GlobalCountryEntry & { localeVariants?: LocaleVariant[] }).localeVariants ?? [];
  const locales = variants.map((v) => v.locale);
  if (!locales.length) locales.push(country.locale);

  const paymentRegion = extensions.paymentRegions[code] ?? "EU";

  return {
    countryCode: code,
    countryName: country.countryName,
    nativeCountryName: country.nativeCountryName || country.countryName,
    defaultLanguage: country.defaultLanguage,
    supportedLanguages: [...country.supportedLanguages],
    locales,
    currency: country.currency,
    currencySymbol: country.currencySymbol,
    timezone: country.timezone,
    textDirection: country.textDirection === "rtl" ? "rtl" : "ltr",
    vat: buildVatRules(code),
    shippingRegion: extensions.shippingRegions[code] ?? "EU_CENTRAL",
    paymentRegion,
    legalRegion: extensions.legalRegions[code] ?? `EU_${code}`,
    returnRegion: extensions.returnRegions[code] ?? paymentRegion,
    supplierRegion: extensions.supplierRegions[code] ?? paymentRegion,
    status: resolveMarketStatus(country),
    featureFlags: resolveFeatureFlags(code),
    marketplaces: extensions.marketplaces[code] ?? [],
    paymentCapabilities: extensions.paymentCapabilities[paymentRegion] ?? ["card"],
    shippingCapabilities: [...extensions.shippingCapabilities],
    source: country,
  };
}

function ensureRegistryBuilt(): void {
  if (marketByCode.size > 0) return;
  for (const country of countriesData as GlobalCountryEntry[]) {
    marketByCode.set(country.countryCode, buildMarketConfig(country));
  }
}

export function getMarketRegistryCount(): number {
  ensureRegistryBuilt();
  return marketByCode.size;
}

export function validateMarketRegistry(): { valid: boolean; count: number; errors: string[] } {
  ensureRegistryBuilt();
  const errors: string[] = [];
  const count = marketByCode.size;
  if (count !== REQUIRED_MARKET_COUNT) {
    errors.push(`Expected ${REQUIRED_MARKET_COUNT} markets, found ${count}`);
  }
  for (const country of countriesData as GlobalCountryEntry[]) {
    if (!marketByCode.has(country.countryCode)) {
      errors.push(`Missing market config for ${country.countryCode}`);
    }
  }
  return { valid: errors.length === 0, count, errors };
}

export function listMarkets(): MarketConfig[] {
  ensureRegistryBuilt();
  return [...marketByCode.values()];
}

export function getMarket(countryCode: string): MarketConfig | undefined {
  ensureRegistryBuilt();
  const code = String(countryCode || "").toUpperCase();
  return marketByCode.get(code);
}

export function getDefaultMarket(): MarketConfig {
  return getMarket(DEFAULT_COUNTRY) ?? listMarkets()[0]!;
}

export function isEuCountry(countryCode: string): boolean {
  return EU_COUNTRY_CODES.has(String(countryCode).toUpperCase());
}

export function getMarketLanguages(countryCode: string): string[] {
  const market = getMarket(countryCode);
  return market?.supportedLanguages ?? [];
}

export function getMarketCurrency(countryCode: string): { code: string; symbol: string } {
  const market = getMarket(countryCode);
  return {
    code: market?.currency ?? "EUR",
    symbol: market?.currencySymbol ?? "€",
  };
}

export function getMarketVat(countryCode: string): VatRules {
  return getMarket(countryCode)?.vat ?? { standardRate: 0.2, pricesIncludeVat: true, taxModel: "VAT" };
}

export function getMarketShippingRegion(countryCode: string): string {
  return getMarket(countryCode)?.shippingRegion ?? "EU_CENTRAL";
}

export function getMarketPaymentRegion(countryCode: string): string {
  return getMarket(countryCode)?.paymentRegion ?? "EU";
}

export function getMarketLegalRegion(countryCode: string): string {
  return getMarket(countryCode)?.legalRegion ?? "EU_DE";
}

export function getMarketStatus(countryCode: string): MarketStatus {
  return getMarket(countryCode)?.status ?? "PLANNED";
}

export function isMarketActive(countryCode: string): boolean {
  const status = getMarketStatus(countryCode);
  return status === "ACTIVE" || status === "TESTING";
}

/** Re-export i18n country config for language integration — no duplicate list. */
export { getCountryConfig };
