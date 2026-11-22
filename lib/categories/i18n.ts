import type { BuzzardLocale } from "@/lib/i18n/types";
import { categoryLabelsDe } from "./translations/de.generated";
import { categoryLabelsEn } from "./translations/en.generated";
import { categoryLabelsAr } from "./translations/ar.generated";
import { categoryLabelsTr } from "./translations/tr.generated";
import catalogLocale from "./translations/catalog-locale.json";

const explicitLabels: Record<string, Record<string, string>> = {
  ...catalogLocale.mains,
  ...catalogLocale.textile,
};

export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  const explicit = explicitLabels[category.id]?.[locale];
  if (explicit) return explicit;
  if (locale === "de") return categoryLabelsDe[category.id] ?? category.name;
  if (locale === "en") return categoryLabelsEn[category.id] ?? category.name;
  if (locale === "ar") return categoryLabelsAr[category.id] ?? category.name;
  if (locale === "tr") return categoryLabelsTr[category.id] ?? category.name;
  return category.name;
}

const UPPERCASE_LOCALE_TAG: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  tr: "tr-TR",
  ar: "ar",
  fr: "fr",
  nl: "nl",
  bg: "bg",
  hr: "hr",
  el: "el",
  cs: "cs",
  da: "da",
  et: "et",
  fi: "fi",
  hu: "hu",
  it: "it",
  lv: "lv",
  lt: "lt",
  lb: "lb",
  mt: "mt",
  pl: "pl",
  pt: "pt-PT",
  ro: "ro",
  sk: "sk",
  sl: "sl",
  es: "es",
  ca: "ca",
  eu: "eu",
  gl: "gl",
  sv: "sv",
  ga: "ga",
};

/** Locale-aware uppercase so Turkish i → İ (TEKSTİL, OTOMOTİV). */
export function toCategoryDisplayUpperCase(label: string, locale: BuzzardLocale): string {
  return label.toLocaleUpperCase(UPPERCASE_LOCALE_TAG[locale] ?? "de-DE");
}

export function formatMenuLabel(
  category: { id: string; menu_order: number; name: string },
  locale: BuzzardLocale = "de"
): string {
  const label = getCategoryLabel(category, locale);
  if (category.id.match(/^cat-\d{2}$/)) {
    return `${String(category.menu_order).padStart(2, "0")}. ${toCategoryDisplayUpperCase(label, locale)}`;
  }
  return label;
}
