import type { MarketCountry } from "./types";
import { marketCountries } from "./source";

/** Pseudo-entry for Arabic language; not a shipping destination. */
export const LANGUAGE_ONLY_COUNTRY_CODES = new Set(["AR"]);

export function getDeliverableMarketCountries(): MarketCountry[] {
  return marketCountries.filter((c) => !LANGUAGE_ONLY_COUNTRY_CODES.has(c.code));
}

export function getMarketCountry(code: string): MarketCountry | undefined {
  return marketCountries.find((c) => c.code === code.toUpperCase());
}

export function getDeliverableMarketCountry(code: string): MarketCountry | undefined {
  const country = getMarketCountry(code);
  if (!country || LANGUAGE_ONLY_COUNTRY_CODES.has(country.code)) return undefined;
  return country;
}

export function defaultMarketCountryCode(): string {
  return "DE";
}

export function detectMarketCountryCode(): string {
  if (typeof navigator === "undefined") return defaultMarketCountryCode();

  const lang = (navigator.language || "de-DE").toLowerCase();
  const region = lang.split("-")[1]?.toUpperCase();
  if (region) {
    const match = getDeliverableMarketCountry(region);
    if (match) return match.code;
  }

  const language = lang.split("-")[0];
  const byLanguage = getDeliverableMarketCountries().find((c) => c.language === language);
  return byLanguage?.code ?? defaultMarketCountryCode();
}
