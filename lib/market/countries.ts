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

/** Hauptwebsite: Deutschland als Standardmarkt — keine Browser-Geo-Autodetection. */
export function detectMarketCountryCode(): string {
  return defaultMarketCountryCode();
}
