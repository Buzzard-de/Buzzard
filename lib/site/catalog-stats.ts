import { getMainCategories } from "@/lib/categories/service";

/** Number of top-level menu categories (dynamic from taxonomy). */
export function getMainCategoryCount(): number {
  return getMainCategories().length;
}

/** German label for homepage / top bar, e.g. "53 Kategorien". */
export function getCategoryCountLabelDe(): string {
  return `${getMainCategoryCount()} Kategorien`;
}
