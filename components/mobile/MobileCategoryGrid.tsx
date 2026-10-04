"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getMainCategoryIcon,
  getVisibleMainCategories,
} from "@/lib/categories";
import { useLocale } from "@/lib/i18n/context";

export default function MobileCategoryGrid() {
  const { locale, t } = useLocale();
  const categories = getVisibleMainCategories().slice(0, 8);

  return (
    <section aria-labelledby="buzzard-mobile-categories-title">
      <div className="buzzard-mobile-section-head">
        <h2 id="buzzard-mobile-categories-title" className="buzzard-mobile-section-title">
          {t("megaMenu.mainCategories")}
        </h2>
        <Link href="/products/" className="buzzard-mobile-section-link">
          {t("hero.secondary")}
        </Link>
      </div>
      <div className="buzzard-mobile-category-grid">
        {categories.map((cat) => (
          <Link key={cat.id} href={categoryHref(cat)} className="buzzard-mobile-category-card">
            <span className="buzzard-mobile-category-card-icon">
              <CategoryIcon name={getMainCategoryIcon(cat.id)} size={28} />
            </span>
            <span className="buzzard-mobile-category-card-label">{formatMenuLabel(cat, locale)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
