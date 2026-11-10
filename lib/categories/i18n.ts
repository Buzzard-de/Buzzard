import type { BuzzardLocale } from "@/lib/i18n/types";
import categoryTree from "@/data/i18n/category-tree.json";
import { categoryLabelsDe } from "./translations/de.generated";
import { categoryLabelsEn } from "./translations/en.generated";
import { categoryLabelsAr } from "./translations/ar.generated";
import { categoryLabelsTr } from "./translations/tr.generated";

const TREE = categoryTree as Record<string, Partial<Record<string, string>>>;
const GENERATED: Record<string, Record<string, string>> = {
  de: categoryLabelsDe,
  en: categoryLabelsEn,
  ar: categoryLabelsAr,
  tr: categoryLabelsTr,
};

const TURKISH_RE = /[İıŞşĞğ]|Elbise|Giyim|Pantolon|Gömlek|Tişört|Şort|Bluz|Hırka|Kazak|Sütyen/;
const GERMAN_RE = /[äöüÄÖÜß]|Bekleidung|Reinigung|Heizung|Fahrzeug|Küche/;

export function looksLikeTurkishLabel(label: string): boolean {
  return TURKISH_RE.test(label);
}

export function looksLikeGermanLabel(label: string): boolean {
  return GERMAN_RE.test(label);
}

function treeLabel(id: string, locale: string): string | undefined {
  const value = TREE[id]?.[locale];
  return value && value.trim() ? value : undefined;
}

/**
 * Generated de/en/tr/ar catalogs stay first. A Turkish string stored in the
 * English or Arabic generated file is replaced by that locale's category-tree
 * label. Other locales use the category-tree row for that language. There is
 * no silent English substitute.
 */
export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  const generated = GENERATED[locale]?.[category.id];
  const localized = treeLabel(category.id, locale);
  if (locale === "ar") {
    if (generated && /[\u0600-\u06FF]/.test(generated)) return generated;
    if (localized) return localized;
    return generated || category.name;
  }
  if (generated && !(locale !== "tr" && looksLikeTurkishLabel(generated) && localized)) {
    return generated;
  }
  if (localized) return localized;
  return generated || category.name;
}

const UPPERCASE_LOCALE_TAG: Record<string, string> = {
  de: "de-DE",
  en: "en-US",
  tr: "tr-TR",
  ar: "ar",
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
