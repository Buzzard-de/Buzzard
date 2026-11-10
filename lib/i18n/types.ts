import { LANGUAGE_CODES, LANGUAGE_LABELS, isRtlLanguage } from "./languages";

/** Catalog language code. All 30 codes are both UI languages and URL prefixes. */
export type BuzzardLocale = (typeof LANGUAGE_CODES)[number];
export type BuzzardLanguageCode = BuzzardLocale;
export type BuzzardRoutingLocale = BuzzardLocale;
export type BuzzardEmailLocale = BuzzardLocale;

export const SUPPORTED_LOCALES: BuzzardLocale[] = [...LANGUAGE_CODES];
export const UI_READY_LANGUAGES: BuzzardLanguageCode[] = [...LANGUAGE_CODES];

/**
 * Continuation software routes every catalog language as a path prefix
 * (`/de/`, `/fr/`, `/pl/`, …). This is the full prefix list, not a 4-locale whitelist.
 */
export const ROUTING_LOCALE_PREFIXES: readonly BuzzardLocale[] = LANGUAGE_CODES;

export const LOCALE_LABELS: Record<string, string> = { ...LANGUAGE_LABELS };

export const RTL_LANGUAGES: BuzzardLanguageCode[] = LANGUAGE_CODES.filter((code) =>
  isRtlLanguage(code)
) as BuzzardLanguageCode[];
export const RTL_LOCALES: BuzzardLocale[] = RTL_LANGUAGES;

export function isRtlLocale(locale: string): boolean {
  return isRtlLanguage(locale);
}

export function localeDirection(locale: string): "rtl" | "ltr" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

/** Locale tags supported for loadLocale() — maps to language catalogs. */
export const LOCALE_TAG_MAP: Record<string, BuzzardLanguageCode> = {
  "de-DE": "de", "de-AT": "de", "de-BE": "de", "de-LU": "de",
  "en-GB": "en", "en-IE": "en", "en-MT": "en", "en-SA": "en", "en-AE": "en",
  "en-QA": "en", "en-KW": "en", "en-BH": "en", "en-OM": "en", "en-EG": "en", "en-DE": "en",
  "fr-FR": "fr", "fr-BE": "fr", "fr-LU": "fr",
  "nl-NL": "nl", "nl-BE": "nl",
  "bg-BG": "bg", "hr-HR": "hr", "el-GR": "el", "el-CY": "el",
  "cs-CZ": "cs", "da-DK": "da", "et-EE": "et", "fi-FI": "fi", "hu-HU": "hu",
  "it-IT": "it", "lv-LV": "lv", "lt-LT": "lt", "lb-LU": "lb", "mt-MT": "mt",
  "pl-PL": "pl", "pt-PT": "pt", "ro-RO": "ro", "sk-SK": "sk", "sl-SI": "sl",
  "es-ES": "es", "ca-ES": "ca", "eu-ES": "eu", "gl-ES": "gl", "sv-SE": "sv",
  "tr-TR": "tr", "tr-CY": "tr",
  "ar-SA": "ar", "ar-AE": "ar", "ar-QA": "ar", "ar-KW": "ar", "ar-BH": "ar",
  "ar-OM": "ar", "ar-EG": "ar", "ar-DE": "ar",
  "ga-IE": "ga",
};

/** Unknown tags resolve to German, the technical catalog fallback. */
export function languageCodeFromLocaleTag(localeTag: string): BuzzardLanguageCode {
  const lang = localeTag.replace("_", "-").split("-")[0]?.toLowerCase() ?? "de";
  if ((LANGUAGE_CODES as readonly string[]).includes(lang)) return lang as BuzzardLanguageCode;
  return "de";
}

export function isSupportedLocale(code: string): code is BuzzardLanguageCode {
  const lang = code.replace("_", "-").split("-")[0]?.toLowerCase() ?? "";
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang);
}

export function resolveSupportedLocale(code: string, fallback: BuzzardLanguageCode = "de"): BuzzardLanguageCode {
  const lang = code.replace("_", "-").split("-")[0]?.toLowerCase() ?? "";
  if ((SUPPORTED_LOCALES as readonly string[]).includes(lang)) return lang as BuzzardLanguageCode;
  return fallback;
}

export function resolveLanguageFromLocaleTag(localeTag: string): BuzzardLanguageCode {
  const normalized = localeTag.replace("_", "-");
  return LOCALE_TAG_MAP[normalized] ?? languageCodeFromLocaleTag(normalized);
}
