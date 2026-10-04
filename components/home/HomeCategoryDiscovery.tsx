"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryById,
  getMainCategoryIcon,
} from "@/lib/categories";
import { getHomeFeaturedCategoryIds } from "@/lib/navigation/home-config";
import { useLocale } from "@/lib/i18n/context";

export default function HomeCategoryDiscovery() {
  const { locale, t } = useLocale();
  const ids = getHomeFeaturedCategoryIds(12);

  return (
    <section className="home-section home-category-discovery" aria-labelledby="home-categories-title">
      <div className="home-section-head">
        <h2 id="home-categories-title">{t("home.categoryDiscovery")}</h2>
        <Link href="/products/" className="home-section-link">
          {t("home.allCategories")} →
        </Link>
      </div>
      <div className="home-category-grid">
        {ids.map((id) => {
          const cat = getCategoryById(id);
          if (!cat) return null;
          return (
            <Link key={id} href={categoryHref(cat)} className="home-category-tile">
              <span className="home-category-tile-icon">
                <CategoryIcon name={getMainCategoryIcon(id)} size={28} />
              </span>
              <span className="home-category-tile-label">{formatMenuLabel(cat, locale)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
