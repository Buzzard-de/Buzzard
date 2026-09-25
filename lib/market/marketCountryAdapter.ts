/**
 * Adapter: global 35-country registry → MarketCountry (single authoritative source).
 * Legacy buzzard_europe_countries.json is NOT used as a country list — overlay metadata only.
 */
import globalCountries from "@/data/global/global_countries_35.json";
import marketOverlay from "@/data/global/market_country_overlay.json";
import type { MarketCountry } from "./types";

type GlobalCountryEntry = (typeof globalCountries)[number];
type OverlayEntry = {
  flag: string;
  taxRate: number;
  deliveryDays: string;
  rtl: boolean;
  taxModel: string;
  languageName: string;
};

const overlayByCode = marketOverlay as Record<string, OverlayEntry>;

function countryCodeToFlag(code: string): string {
  return code.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

function defaultOverlay(country: GlobalCountryEntry): OverlayEntry {
  return {
    flag: countryCodeToFlag(country.countryCode),
    taxRate: 0.2,
    deliveryDays: "5–10 business days",
    rtl: country.defaultLanguage === "ar",
    taxModel: "VAT",
    languageName: country.defaultLanguage,
  };
}

export function adaptGlobalCountryToMarket(country: GlobalCountryEntry): MarketCountry {
  const overlay = overlayByCode[country.countryCode] ?? defaultOverlay(country);
  return {
    code: country.countryCode,
    name: country.nativeCountryName || country.countryName,
    flag: overlay.flag,
    language: country.defaultLanguage,
    languageName: overlay.languageName,
    currency: country.currency,
    locale: country.locale,
    taxModel: overlay.taxModel,
    taxRate: overlay.taxRate,
    deliveryDays: overlay.deliveryDays,
    rtl: overlay.rtl,
  };
}

/** Authoritative market country list — exactly 35 countries from global registry. */
export const marketCountries: MarketCountry[] = (globalCountries as GlobalCountryEntry[]).map(
  adaptGlobalCountryToMarket
);

export function getMarketCountryCount(): number {
  return marketCountries.length;
}
