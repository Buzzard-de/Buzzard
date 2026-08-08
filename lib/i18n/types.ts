export type BuzzardLocale = "de" | "en" | "tr" | "ar";

export const SUPPORTED_LOCALES: BuzzardLocale[] = ["de", "en", "tr", "ar"];

export const LOCALE_LABELS: Record<BuzzardLocale, string> = {
  de: "Deutsch",
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
};

export const RTL_LOCALES: BuzzardLocale[] = ["ar"];

export function isRtlLocale(locale: BuzzardLocale): boolean {
  return RTL_LOCALES.includes(locale);
}
