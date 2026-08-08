import type { BuzzardLocale } from "./types";

const LOCALE_MAP: Record<BuzzardLocale, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  ar: "ar-AE",
};

export function getIntlLocale(locale: BuzzardLocale): string {
  return LOCALE_MAP[locale] ?? LOCALE_MAP.de;
}

export function formatPrice(amount: number, locale: BuzzardLocale = "de", currency = "EUR"): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale: BuzzardLocale = "de"): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

export function formatPercent(value: number, locale: BuzzardLocale = "de"): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatDate(
  value: Date | string | number,
  locale: BuzzardLocale = "de",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
}

export function formatDateTime(value: Date | string | number, locale: BuzzardLocale = "de"): string {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}
