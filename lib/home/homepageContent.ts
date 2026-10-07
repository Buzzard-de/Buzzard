import { getVisibleMainCategories } from "@/lib/categories";
import { APPROVED_CUSTOMER_FACING_L1_COUNT } from "@/lib/categories/customerFacing";
import type { BuzzardCategory } from "@/lib/categories/types";

/** Canonical homepage category source — same IDs for desktop and mobile. */
export function getHomeCategoryList(): BuzzardCategory[] {
  return getVisibleMainCategories();
}

export function getHomeCategoryIds(): string[] {
  return getHomeCategoryList().map((cat) => cat.id);
}

export function getHomeCustomerCategoryCount(): number {
  return getHomeCategoryIds().length;
}

export const HOME_CATALOG_HREF = "/products/";

export { APPROVED_CUSTOMER_FACING_L1_COUNT };
