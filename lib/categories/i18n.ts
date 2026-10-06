import type { BuzzardLocale } from "@/lib/i18n/types";
import { getIntlLocale } from "@/lib/i18n/format";
import { categoryLabelsDe } from "./translations/de.generated";
import { categoryLabelsEn } from "./translations/en.generated";
import { categoryLabelsAr } from "./translations/ar.generated";
import { categoryLabelsTr } from "./translations/tr.generated";

const CATEGORY_LABELS: Partial<Record<BuzzardLocale, Record<string, string>>> = {
  de: categoryLabelsDe,
  en: categoryLabelsEn,
  ar: categoryLabelsAr,
  tr: categoryLabelsTr,
};

export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  const localized = CATEGORY_LABELS[locale]?.[category.id];
  if (localized) return localized;
  return categoryLabelsDe[category.id] ?? category.name;
}

/** Locale-aware uppercase so Turkish i → İ (TEKSTİL, OTOMOTİV). */
export function toCategoryDisplayUpperCase(label: string, locale: BuzzardLocale): string {
  return label.toLocaleUpperCase(getIntlLocale(locale));
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
