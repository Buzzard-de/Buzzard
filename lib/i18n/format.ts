const LOCALE_MAP: Record<string, string> = {
  de: "de-DE",
  en: "en-GB",
  tr: "tr-TR",
  ar: "ar-AE",
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

export function getIntlLocale(locale: string): string {
  return LOCALE_MAP[locale] ?? LOCALE_MAP.de;
}

export function formatPrice(amount: number, locale: string = "de", currency = "EUR"): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, locale: string = "de"): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

export function formatPercent(value: number, locale: string = "de"): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function formatDate(
  value: Date | string | number,
  locale: string = "de",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
}

export function formatDateTime(value: Date | string | number, locale: string = "de"): string {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}
