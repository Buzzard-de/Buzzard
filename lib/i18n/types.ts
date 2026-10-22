import supportedLocalesJson from "./supported-locales.json";

/** All Buzzard UI language codes with full translation catalogs. */
export type BuzzardLanguageCode =
  | "de"
  | "en"
  | "tr"
  | "ar"
  | "fr"
  | "nl"
  | "bg"
  | "hr"
  | "el"
  | "cs"
  | "da"
  | "et"
  | "fi"
  | "hu"
  | "it"
  | "lv"
  | "lt"
  | "lb"
  | "mt"
  | "pl"
  | "pt"
  | "ro"
  | "sk"
  | "sl"
  | "es"
  | "ca"
  | "eu"
  | "gl"
  | "sv"
  | "ga";

/**
 * URL routing prefixes remain /de|en|tr|ar/ by design: the static export
 * historically shipped four prefixed trees. The other 26 UI locales are
 * selected in-app (buzzard_locale) and encoded as `?lang=` on German paths.
 * This is intentional, not a leftover 4-locale product whitelist.
 */
export type BuzzardRoutingLocale = "de" | "en" | "tr" | "ar";

export type BuzzardLocale = BuzzardLanguageCode;
export type BuzzardEmailLocale = BuzzardLanguageCode;

export const UI_READY_LANGUAGES = supportedLocalesJson as BuzzardLanguageCode[];

/** Legacy 4-locale prefix routing support. */
export const ROUTING_LOCALE_PREFIXES = ["de", "en", "tr", "ar"] as const;

export const SUPPORTED_LOCALES: BuzzardLanguageCode[] = [...UI_READY_LANGUAGES];

export const LOCALE_LABELS: Record<BuzzardLanguageCode, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
  fr: "Français",
  nl: "Nederlands",
  bg: "Български",
  hr: "Hrvatski",
  el: "Ελληνικά",
  cs: "Čeština",
  da: "Dansk",
  et: "Eesti",
  fi: "Suomi",
  hu: "Magyar",
  it: "Italiano",
  lv: "Latviešu",
  lt: "Lietuvių",
  lb: "Lëtzebuergesch",
  mt: "Malti",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  sk: "Slovenčina",
  sl: "Slovenščina",
  es: "Español",
  ca: "Català",
  eu: "Euskara",
  gl: "Galego",
  sv: "Svenska",
  ga: "Gaeilge",
};

export const RTL_LANGUAGES: BuzzardLanguageCode[] = ["ar"];
export const RTL_LOCALES = RTL_LANGUAGES;

export function isRtlLocale(locale: BuzzardLanguageCode): boolean {
  return RTL_LANGUAGES.includes(locale);
}

export function localeDirection(locale: BuzzardLanguageCode): "rtl" | "ltr" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

/** Map BCP-47 locale tag to language catalog code. */
export function languageCodeFromLocaleTag(localeTag: string): BuzzardLanguageCode {
  const lang = localeTag.replace("_", "-").split("-")[0]?.toLowerCase() ?? "en";
  if (lang in LOCALE_LABELS) return lang as BuzzardLanguageCode;
  return "en";
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

export function isSupportedLocale(code: string): code is BuzzardLanguageCode {
  const lang = code.replace("_", "-").split("-")[0]?.toLowerCase() ?? "";
  return (SUPPORTED_LOCALES as string[]).includes(lang);
}

export function resolveSupportedLocale(code: string, fallback: BuzzardLanguageCode = "en"): BuzzardLanguageCode {
  if (isSupportedLocale(code)) {
    return code.replace("_", "-").split("-")[0]?.toLowerCase() as BuzzardLanguageCode;
  }
  const lang = code.replace("_", "-").split("-")[0]?.toLowerCase() ?? "";
  if ((SUPPORTED_LOCALES as string[]).includes(lang)) return lang as BuzzardLanguageCode;
  return fallback;
}

export function resolveLanguageFromLocaleTag(localeTag: string): BuzzardLanguageCode {
  const normalized = localeTag.replace("_", "-");
  const exact = LOCALE_TAG_MAP[normalized];
  if (exact) return exact;
  return languageCodeFromLocaleTag(normalized);
}
