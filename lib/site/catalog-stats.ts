import { getNavigableMainCategories } from "@/lib/categories/service";
import { getMasterCategoryCount } from "@/lib/categories/master";

/** Navigable L1 + hubs (not the approved 50-master list). */
export function getMainCategoryCount(): number {
  return getNavigableMainCategories().length;
}

export function getApprovedMasterCategoryCount(): number {
  return getMasterCategoryCount();
}

/** German label for homepage / top bar, e.g. "53 Kategorien". */
export function getCategoryCountLabelDe(): string {
  return `${getMainCategoryCount()} Kategorien`;
}
