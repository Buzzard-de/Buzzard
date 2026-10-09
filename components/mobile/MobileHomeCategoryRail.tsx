"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  getCategoryLabel,
  getMainCategoryIcon,
} from "@/lib/categories";
import { useHomeUI } from "@/lib/home-ui";
import { getHomeCategoryList } from "@/lib/home/homepageContent";
import { useLocale } from "@/lib/i18n/context";

const RAIL_CATEGORY_COUNT = 9;

export default function MobileHomeCategoryRail() {
  const homeUI = useHomeUI();
  const { locale, t } = useLocale();
  const categories = getHomeCategoryList().slice(0, RAIL_CATEGORY_COUNT);

  return (
    <nav className="buzzard-mobile-only mobile-home-category-rail" aria-label={t("home.mainCategories")}>
      {categories.map((category) => (
        <Link key={category.id} href={categoryHref(category)} className="mobile-home-category-rail-link">
          <CategoryIcon name={getMainCategoryIcon(category.id)} size={22} />
          <span>{getCategoryLabel(category, locale)}</span>
        </Link>
      ))}
      <button
        type="button"
        className="mobile-home-category-rail-link mobile-home-category-rail-more"
        onClick={homeUI?.openMegaMenu}
        aria-label={t("nav.allCategories")}
      >
        <span className="mobile-home-category-rail-dots" aria-hidden="true">•••</span>
        <span>{t("mobile.categories")}</span>
      </button>
    </nav>
  );
}
