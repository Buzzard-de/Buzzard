"use client";

import Link from "next/link";
import { categoryHref, getCategoryLabel } from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";

export default function MobileCategoryList({ categories }: { categories: BuzzardCategory[] }) {
  const { locale } = useLocale();
  if (categories.length === 0) return null;

  return (
    <div className="buzzard-mobile-category-list">
      {categories.map((child) => (
        <Link key={child.id} href={categoryHref(child)} className="buzzard-mobile-category-row">
          {getCategoryLabel(child, locale)}
          <span aria-hidden="true">›</span>
        </Link>
      ))}
    </div>
  );
}
