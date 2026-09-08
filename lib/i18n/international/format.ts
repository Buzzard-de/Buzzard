import type { BuzzardLocale } from "@/lib/i18n/types";

export function formatCurrencyIntl(
  amount: number,
  currency: string,
  locale: string,
  timezone?: string
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNumberIntl(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDateIntl(
  value: Date | string | number,
  locale: string,
  timezone?: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { ...options, ...(timezone ? { timeZone: timezone } : {}) }).format(date);
}

export function formatDateTimeIntl(
  value: Date | string | number,
  locale: string,
  timezone?: string
): string {
  return formatDateIntl(value, locale, timezone, { dateStyle: "medium", timeStyle: "short" });
}

export function formatPercentIntl(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
}

/** Map any language code to Buzzard UI locale for existing format helpers. */
export function resolveIntlLocale(languageCode: string, marketLocale: string): string {
  const map: Record<BuzzardLocale, string> = {
    de: "de-DE",
    en: "en-GB",
    tr: "tr-TR",
    ar: "ar-SA",
  };
  if (languageCode in map) return map[languageCode as BuzzardLocale];
  return marketLocale;
}
