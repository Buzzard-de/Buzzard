import type { BuzzardLanguageCode } from "./types";
import { LOCALE_TAG_MAP } from "./types";

const INTL_LOCALE_BY_LANGUAGE: Record<BuzzardLanguageCode, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  ar: "ar-SA",
  fr: "fr-FR",
  nl: "nl-NL",
  bg: "bg-BG",
  hr: "hr-HR",
  el: "el-GR",
  cs: "cs-CZ",
  da: "da-DK",
  et: "et-EE",
  fi: "fi-FI",
  hu: "hu-HU",
  it: "it-IT",
  lv: "lv-LV",
  lt: "lt-LT",
  lb: "lb-LU",
  mt: "mt-MT",
  pl: "pl-PL",
  pt: "pt-PT",
  ro: "ro-RO",
  sk: "sk-SK",
  sl: "sl-SI",
  es: "es-ES",
  ca: "ca-ES",
  eu: "eu-ES",
  gl: "gl-ES",
  sv: "sv-SE",
  ga: "ga-IE",
};

export function getIntlLocale(language: BuzzardLanguageCode, localeTag?: string): string {
  if (localeTag && LOCALE_TAG_MAP[localeTag]) {
    const tag = localeTag.replace("_", "-");
    if (LOCALE_TAG_MAP[tag] === language) return tag;
  }
  return INTL_LOCALE_BY_LANGUAGE[language] ?? INTL_LOCALE_BY_LANGUAGE.de;
}

export function formatPrice(
  amount: number,
  language: BuzzardLanguageCode = "de",
  currency = "EUR",
  localeTag?: string
): string {
  return new Intl.NumberFormat(getIntlLocale(language, localeTag), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, language: BuzzardLanguageCode = "de", localeTag?: string): string {
  return new Intl.NumberFormat(getIntlLocale(language, localeTag)).format(value);
}

export function formatPercent(value: number, language: BuzzardLanguageCode = "de", localeTag?: string): string {
  return new Intl.NumberFormat(getIntlLocale(language, localeTag), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatDate(
  value: Date | string | number,
  language: BuzzardLanguageCode = "de",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  localeTag?: string
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(getIntlLocale(language, localeTag), options).format(date);
}

export function formatDateTime(
  value: Date | string | number,
  language: BuzzardLanguageCode = "de",
  localeTag?: string
): string {
  return formatDate(value, language, { dateStyle: "medium", timeStyle: "short" }, localeTag);
}
