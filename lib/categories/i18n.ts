import type { BuzzardLocale } from "@/lib/i18n/types";
import { categoryLabelsDe } from "./translations/de.generated";
import { categoryLabelsEn } from "./translations/en.generated";
import { categoryLabelsAr } from "./translations/ar.generated";

function isTechnicalCategoryToken(value: string): boolean {
  const token = value.trim();
  return /^[A-Z][A-Z0-9]*_\d+[A-Z0-9_]*$/.test(token);
}

function resolveCategoryLabel(
  categoryId: string,
  fallbackName: string,
  locale: BuzzardLocale
): string {
  const fromDe = categoryLabelsDe[categoryId];
  const fromEn = categoryLabelsEn[categoryId];
  const fromAr = categoryLabelsAr[categoryId];

  if (locale === "de") return fromDe ?? fallbackName;
  if (locale === "en") return fromEn ?? fromDe ?? fallbackName;
  if (locale === "ar") return fromAr ?? fromEn ?? fromDe ?? fallbackName;

  // Extended UI locales: taxonomy label maps (de/en) — never expose raw technical IDs.
  const label = fromDe ?? fromEn ?? fallbackName;
  return isTechnicalCategoryToken(label) ? fromDe ?? fromEn ?? "—" : label;
}

export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  return resolveCategoryLabel(category.id, category.name, locale);
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
