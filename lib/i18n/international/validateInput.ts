import { getCountryConfig } from "./config";
import { SUPPORTED_LOCALES, type BuzzardLanguageCode } from "@/lib/i18n/types";

const COUNTRY_CODE = /^[A-Z]{2}$/;

/** Whitelist validation — reject invalid country/locale from client input. */
export function validateCountryCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const normalized = code.trim().toUpperCase();
  if (!COUNTRY_CODE.test(normalized)) return null;
  if (!getCountryConfig(normalized)) return null;
  return normalized;
}

export function validateLanguageCode(code: unknown): BuzzardLanguageCode | null {
  if (typeof code !== "string") return null;
  const normalized = code.trim().toLowerCase().slice(0, 2);
  if (!/^[a-z]{2}$/.test(normalized)) return null;
  if (!SUPPORTED_LOCALES.includes(normalized as BuzzardLanguageCode)) return null;
  return normalized as BuzzardLanguageCode;
}

export function isLanguageSupportedForCountry(countryCode: string, languageCode: string): boolean {
  const country = getCountryConfig(countryCode);
  if (!country) return false;
  return country.supportedLanguages.includes(languageCode.toLowerCase());
}
