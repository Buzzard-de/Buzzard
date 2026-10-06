import {
  categoryHref,
  getChildren,
  getParentCategory,
  getVisibleMainCategories,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";

export function getMobileFilterScope(category: BuzzardCategory | null): {
  allHref: string;
  categories: BuzzardCategory[];
} {
  if (!category) {
    return { allHref: "/products/", categories: getVisibleMainCategories() };
  }

  const children = getChildren(category.id);
  if (children.length > 0) {
    return { allHref: categoryHref(category), categories: children };
  }

  const parent = getParentCategory(category.id);
  return {
    allHref: parent ? categoryHref(parent) : "/products/",
    categories: parent ? getChildren(parent.id) : [],
  };
}
