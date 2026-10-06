"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  getCategoryAncestors,
  getCategoryLabel,
  getMainCategoryIcon,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";

function iconFor(category: BuzzardCategory): string {
  const root = getCategoryAncestors(category.id)[0] ?? category;
  return getMainCategoryIcon(root.id);
}

export default function MobileCategoryList({ categories }: { categories: BuzzardCategory[] }) {
  const { locale } = useLocale();
  if (categories.length === 0) return null;

  return (
    <div className="buzzard-mobile-category-list">
      {categories.map((child) => (
        <Link key={child.id} href={categoryHref(child)} className="buzzard-mobile-category-row">
          <span className="buzzard-mobile-category-row-icon" aria-hidden="true">
            <CategoryIcon name={iconFor(child)} size={22} />
          </span>
          <span className="buzzard-mobile-category-row-label">{getCategoryLabel(child, locale)}</span>
          <span className="buzzard-mobile-category-row-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
