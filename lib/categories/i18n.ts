import type { BuzzardLocale } from "@/lib/i18n/types";
import { getIntlLocale } from "@/lib/i18n/format";
import categoryMains from "@/data/i18n/category-mains.json";
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

type CategoryMainMap = Record<string, Partial<Record<BuzzardLocale, string>>>;
const MAINS = categoryMains as CategoryMainMap;
const missingCategoryKeys = new Set<string>();

function logMissingCategory(locale: BuzzardLocale, categoryId: string): void {
  const token = `${locale}:${categoryId}`;
  if (process.env.NODE_ENV === "production" || missingCategoryKeys.has(token)) return;
  missingCategoryKeys.add(token);
  console.warn(`[BUZZARD i18n] Missing category translation:\n${locale}.${categoryId}`);
}

export function listMasterCategoryIds(): string[] {
  return Object.keys(MAINS).sort();
}

/** Locale → English → technical name. Never a silent German/Turkish fallback. */
export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  const fromMains = MAINS[category.id]?.[locale];
  if (fromMains) return fromMains;

  const fromLocaleMap = CATEGORY_LABELS[locale]?.[category.id];
  if (fromLocaleMap) return fromLocaleMap;

  const englishMain = MAINS[category.id]?.en;
  if (englishMain) {
    logMissingCategory(locale, category.id);
    return englishMain;
  }

  const fromEnglishMap = CATEGORY_LABELS.en?.[category.id];
  if (fromEnglishMap) {
    logMissingCategory(locale, category.id);
    return fromEnglishMap;
  }

  logMissingCategory(locale, category.id);
  return category.name;
}

export function listMissingCategoryKeys(locale: BuzzardLocale): string[] {
  return listMasterCategoryIds().filter((id) => !MAINS[id]?.[locale]);
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
