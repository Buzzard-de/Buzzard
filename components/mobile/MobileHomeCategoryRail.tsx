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

export default function MobileHomeCategoryRail() {
  const homeUI = useHomeUI();
  const { locale, t } = useLocale();
  const categories = getHomeCategoryList();

  return (
    <nav className="buzzard-mobile-only mobile-home-category-rail" aria-label={t("home.mainCategories")}>
      <Link href="/" className="mobile-home-category-rail-link" aria-current="page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
        </svg>
        <span>{t("mobile.home")}</span>
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={categoryHref(category)}
          className="mobile-home-category-rail-link"
          data-category-id={category.id}
        >
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
