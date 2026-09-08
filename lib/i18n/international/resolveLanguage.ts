import {
  hasManualLocaleOverride,
  readStoredLocale,
} from "@/lib/i18n/detect";
import type { BuzzardLanguageCode } from "@/lib/i18n/types";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import { getCountryConfig, getLocaleVariants } from "./config";
import type { ResolvedLocale } from "./types";
import { detectCountry, type DetectCountryOptions } from "./detectCountry";

export type LanguageResolutionSource =
  | "manual_override"
  | "saved_preference"
  | "browser_language"
  | "country_region"
  | "country_default"
  | "english_fallback"
  | "key";

export interface ResolveLanguageOptions extends DetectCountryOptions {
  explicitLanguage?: string;
  savedLanguage?: string | null;
  savedManualOverride?: boolean;
  browserLanguages?: string[];
}


function languageDirection(code: string): "ltr" | "rtl" {
  return code === "ar" ? "rtl" : "ltr";
}

function resolveVariantLocale(countryCode: string, languageCode: string): string {
  const variants = getLocaleVariants(countryCode);
  const match = variants.find((v) => v.languageCode === languageCode);
  if (match) return match.locale;
  const country = getCountryConfig(countryCode);
  return country?.locale ?? "de-DE";
}

/**
 * Priority:
 * 1. Manual user selection
 * 2. Saved language
 * 3. Browser language (if supported for country)
 * 4. Detected country region
 * 5. Country default language
 * 6. English (technical fallback only)
 */
export function resolveLanguage(options: ResolveLanguageOptions = {}): ResolvedLocale {
  const countryResult = detectCountry(options);
  const country = getCountryConfig(countryResult.countryCode);
  const supported = new Set(country?.supportedLanguages ?? ["de"]);
  const defaultLang = country?.defaultLanguage ?? "de";

  const tryLanguage = (code: string, source: LanguageResolutionSource): ResolvedLocale | null => {
    if (!code || !supported.has(code)) return null;
    return {
      countryCode: countryResult.countryCode,
      languageCode: code,
      locale: resolveVariantLocale(countryResult.countryCode, code),
      currency: country?.currency ?? "EUR",
      timezone: country?.timezone ?? "Europe/Berlin",
      direction: languageDirection(code),
      source,
    };
  };

  if (options.manualOverride || options.savedManualOverride || hasManualLocaleOverride()) {
    const manual = options.explicitLanguage || options.savedLanguage || readStoredLocale();
    if (manual) {
      const lang = manual.length <= 3 ? manual : manual.split("-")[0];
      const resolved = tryLanguage(lang, "manual_override");
      if (resolved) return resolved;
    }
  }

  if (options.explicitLanguage) {
    const lang = options.explicitLanguage.split("-")[0];
    const resolved = tryLanguage(lang, "saved_preference");
    if (resolved) return resolved;
  }

  if (options.savedLanguage) {
    const lang = options.savedLanguage.split("-")[0];
    const resolved = tryLanguage(lang, "saved_preference");
    if (resolved) return resolved;
  }

  const stored = readStoredLocale();
  if (stored) {
    const resolved = tryLanguage(stored, "saved_preference");
    if (resolved) return resolved;
  }

  const browserLangs =
    options.browserLanguages ??
    (typeof navigator !== "undefined"
      ? navigator.languages?.length
        ? [...navigator.languages]
        : [navigator.language]
      : []);

  for (const tag of browserLangs) {
    const code = tag.slice(0, 2).toLowerCase();
    const resolved = tryLanguage(code, "browser_language");
    if (resolved) return resolved;
  }

  const countryDefault = tryLanguage(defaultLang, "country_default");
  if (countryDefault) return countryDefault;

  if (supported.has("en")) {
    return {
      countryCode: countryResult.countryCode,
      languageCode: "en",
      locale: resolveVariantLocale(countryResult.countryCode, "en"),
      currency: country?.currency ?? "EUR",
      timezone: country?.timezone ?? "Europe/Berlin",
      direction: "ltr",
      source: "english_fallback",
    };
  }

  return {
    countryCode: countryResult.countryCode,
    languageCode: "en",
    locale: "en-GB",
    currency: country?.currency ?? "EUR",
    timezone: country?.timezone ?? "Europe/Berlin",
    direction: "ltr",
    source: "english_fallback",
  };
}

export function toBuzzardUiLocale(languageCode: string): BuzzardLanguageCode {
  const code = languageCode.toLowerCase() as BuzzardLanguageCode;
  if (SUPPORTED_LOCALES.includes(code)) return code;
  return "en";
}

export function applyDocumentDirection(languageCode: string): void {
  if (typeof document === "undefined") return;
  const dir = languageCode === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = languageCode === "ar" ? "ar" : languageCode;
  document.documentElement.classList.toggle("rtl", dir === "rtl");
  document.documentElement.classList.toggle("ltr", dir === "ltr");
}
