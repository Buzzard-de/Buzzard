"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getMainCategoryIcon,
} from "@/lib/categories";
import { getHomeCategoryList } from "@/lib/home/homepageContent";
import { useLocale } from "@/lib/i18n/context";

function groupCategories<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export default function HomeCategoryDiscovery() {
  const { locale, t } = useLocale();
  const categories = getHomeCategoryList();

  return (
    <section className="home-section home-category-discovery" aria-labelledby="home-categories-title">
      <div className="home-section-head">
        <h2 id="home-categories-title">{t("home.mainCategories")}</h2>
        <Link href="/products/" className="home-section-link">
          {t("home.allCategories")}
        </Link>
      </div>
      <div className="home-category-grid" role="list">
        {groupCategories(categories, 3).map((group) => (
          <div key={group.map((cat) => cat.id).join("-")} className="home-category-tile-group">
            {group.map((cat) => (
              <Link
                key={cat.id}
                href={categoryHref(cat)}
                className="home-category-tile"
                role="listitem"
                data-category-id={cat.id}
                aria-label={formatMenuLabel(cat, locale)}
              >
                <span className="home-category-tile-icon">
                  <CategoryIcon name={getMainCategoryIcon(cat.id)} size={28} />
                </span>
                <span className="home-category-tile-label">{formatMenuLabel(cat, locale)}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
