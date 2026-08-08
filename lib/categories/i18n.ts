import type { BuzzardLocale } from "./types";
import { categoryLabelsDe } from "./translations/de.generated";

export function getCategoryLabel(
  category: { id: string; name: string },
  locale: BuzzardLocale = "de"
): string {
  if (locale === "tr") return category.name;
  if (locale === "de") return categoryLabelsDe[category.id] ?? category.name;
  // Arabic placeholder: fall back to Turkish source until dedicated AR catalog exists.
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
