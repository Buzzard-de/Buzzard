import type { BuzzardLocale } from "@/lib/i18n/types";
import { getIntlLocale } from "@/lib/i18n/format";
import categoryTree from "@/data/i18n/category-tree.json";
import categoryFallbacks from "@/data/i18n/category-tree-fallbacks.json";
import { isCustomerFacingL1 } from "./customerFacing";

type CategoryTreeMap = Record<string, Partial<Record<BuzzardLocale, string>>>;
const TREE = categoryTree as CategoryTreeMap;
const missingCategoryKeys = new Set<string>();

const TURKISH_RE = /[İıŞşĞğ]|Elbise|Giyim|Pantolon|Gömlek|Tişört|Şort|Bluz|Hırka|Kazak/;
const GERMAN_RE = /[äöüÄÖÜß]|Bekleidung|Reinigung|Heizung|Fahrzeug|Küche/;

function logMissingCategory(locale: BuzzardLocale, categoryId: string): void {
  const token = `${locale}:${categoryId}`;
  if (process.env.NODE_ENV === "production" || missingCategoryKeys.has(token)) return;
  missingCategoryKeys.add(token);
  console.warn(`[BUZZARD i18n] Missing category translation:\n${locale}.${categoryId}`);
}

export function listCategoryIds(): string[] {
  return Object.keys(TREE).sort();
}

export function listMasterCategoryIds(): string[] {
  return listCategoryIds().filter((id) => /^cat-\d{2}$/.test(id) && isCustomerFacingL1(id));
}

export function listLevelCategoryIds(level: 1 | 2 | 3): string[] {
  const depth = level;
  return listCategoryIds().filter((id) => id.split("-").length === depth + 1 || (depth === 1 && /^cat-\d{2}$/.test(id)));
}

/** Locale → English. Never a silent German/Turkish fallback. */
export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  const row = TREE[category.id];
  const localized = row?.[locale];
  if (localized) return localized;
  const english = row?.en;
  if (english) {
    logMissingCategory(locale, category.id);
    return english;
  }
  logMissingCategory(locale, category.id);
  return category.name;
}

export function listMissingCategoryKeys(locale: BuzzardLocale): string[] {
  return listMasterCategoryIds().filter((id) => !TREE[id]?.[locale]);
}

export function listMissingTreeKeys(locale: BuzzardLocale, level?: 1 | 2 | 3): string[] {
  const ids = level ? listLevelCategoryIds(level) : listCategoryIds();
  return ids.filter((id) => !TREE[id]?.[locale]);
}

export function isRecordedEnglishFallback(categoryId: string, locale: BuzzardLocale): boolean {
  const examples = (categoryFallbacks as { examples?: Array<{ id: string; locale: string }> }).examples ?? [];
  return examples.some((item) => item.id === categoryId && item.locale === locale);
}

export function looksLikeTurkishLabel(label: string): boolean {
  return TURKISH_RE.test(label);
}

export function looksLikeGermanLabel(label: string): boolean {
  return GERMAN_RE.test(label);
}

export { categoryFallbacks };

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
