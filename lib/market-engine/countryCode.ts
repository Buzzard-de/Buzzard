import { getMarket } from "./registry";

const COUNTRY_CODE_RE = /^[A-Z]{2}$/;

export function normalizeCountryCode(raw: string | undefined | null): string | null {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (!COUNTRY_CODE_RE.test(code)) return null;
  return code;
}

export function isKnownMarketCountry(countryCode: string): boolean {
  return Boolean(getMarket(countryCode));
}
