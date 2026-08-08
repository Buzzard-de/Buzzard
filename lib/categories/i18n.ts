import type { BuzzardLocale } from "@/lib/i18n/types";
import { categoryLabelsDe } from "./translations/de.generated";
import { categoryLabelsEn } from "./translations/en.generated";
import { categoryLabelsAr } from "./translations/ar.generated";

export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  if (locale === "de") return categoryLabelsDe[category.id] ?? category.name;
  if (locale === "en") return categoryLabelsEn[category.id] ?? category.name;
  if (locale === "ar") return categoryLabelsAr[category.id] ?? category.name;
  return category.name;
}

export function formatMenuLabel(
  category: { id: string; menu_order: number; name: string },
  locale: BuzzardLocale = "de"
): string {
  const label = getCategoryLabel(category, locale);
  if (category.id.match(/^cat-\d{2}$/)) {
    return `${String(category.menu_order).padStart(2, "0")}. ${label.toUpperCase()}`;
  }
  return label;
}
