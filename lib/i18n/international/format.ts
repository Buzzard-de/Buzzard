import { LOCALE_TAG_MAP } from "@/lib/i18n/types";

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

/** Map language code to primary BCP-47 locale tag. */
export function resolveIntlLocale(languageCode: string, marketLocale: string): string {
  const tag = Object.entries(LOCALE_TAG_MAP).find(([, lang]) => lang === languageCode)?.[0];
  return tag || marketLocale;
}
