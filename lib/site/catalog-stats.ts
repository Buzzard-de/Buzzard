import { getVisibleMainCategories } from "@/lib/categories/service";

/** Number of customer-facing top-level menu categories. */
export function getMainCategoryCount(): number {
  return getVisibleMainCategories().length;
}

/** German label for homepage / top bar, e.g. "50 Kategorien". */
export function getCategoryCountLabelDe(): string {
  return `${getMainCategoryCount()} Kategorien`;
}
