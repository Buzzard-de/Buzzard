import { getDeliverableMarketCountries } from "@/lib/market/countries";

export interface CountryOption {
  code: string;
  labelKey: string;
  name: string;
  vatRate: null;
  vatOfficial: false;
  vatVerified: false;
  vatSource: "UNKNOWN";
  zipPattern: RegExp;
}

const ZIP_PATTERNS: Record<string, RegExp> = {
  DE: /^\d{5}$/,
  AT: /^\d{4}$/,
  CH: /^\d{4}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  BE: /^\d{4}$/,
  FR: /^\d{5}$/,
  IT: /^\d{5}$/,
  PL: /^\d{2}-\d{3}$/,
  TR: /^\d{5}$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  ES: /^\d{5}$/,
  PT: /^\d{4}-\d{3}$/,
  IE: /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/i,
  SE: /^\d{3}\s?\d{2}$/,
  NO: /^\d{4}$/,
  DK: /^\d{4}$/,
  FI: /^\d{5}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  HU: /^\d{4}$/,
  RO: /^\d{6}$/,
};

/** Europe + Balkans storefront countries. VAT stays unknown until an official source is verified. */
export const CHECKOUT_COUNTRIES: CountryOption[] = getDeliverableMarketCountries().map((country) => ({
  code: country.code,
  labelKey: `country.${country.code}`,
  name: country.name,
  vatRate: null,
  vatOfficial: false,
  vatVerified: false,
  vatSource: "UNKNOWN",
  zipPattern: ZIP_PATTERNS[country.code] ?? /^[\w\s-]{3,12}$/i,
}));

export function getCountry(code: string): CountryOption | undefined {
  return CHECKOUT_COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function defaultCountryCode(): string {
  return "DE";
}
