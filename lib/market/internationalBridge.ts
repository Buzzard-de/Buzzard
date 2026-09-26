/**
 * Bridge 35-market international config to existing lib/market types.
 */
import type { MarketCountry } from "@/lib/market/types";
import {
  getEnabledMarkets,
  getMarket,
  type CountryCode,
  type MarketConfig,
} from "@/lib/i18n/internationalCore";

const FLAG_BY_COUNTRY: Partial<Record<CountryCode, string>> = {
  DE: "🇩🇪",
  AT: "🇦🇹",
  TR: "🇹🇷",
  SA: "🇸🇦",
  AE: "🇦🇪",
  FR: "🇫🇷",
  NL: "🇳🇱",
  EG: "🇪🇬",
};

export function internationalMarketToCountry(market: MarketConfig): MarketCountry {
  return {
    code: market.country,
    name: market.nativeName || market.name,
    flag: FLAG_BY_COUNTRY[market.country] ?? "🏳️",
    language: market.language,
    languageName: market.languageName,
    currency: market.currency,
    locale: market.locale,
    taxModel: "VAT",
    taxRate: market.vatRate / 100,
    deliveryDays: "—",
    rtl: market.direction === "rtl",
  };
}

export function getInternationalMarketCountries(): MarketCountry[] {
  return getEnabledMarkets().map(internationalMarketToCountry);
}

export function getInternationalMarketCountry(code: string): MarketCountry | undefined {
  const upper = code.toUpperCase() as CountryCode;
  try {
    return internationalMarketToCountry(getMarket(upper));
  } catch {
    return undefined;
  }
}
