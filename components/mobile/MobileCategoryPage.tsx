"use client";

import { useMemo, useState } from "react";
import {
  categoryHref,
  getCategoryAncestors,
  getCategoryBreadcrumb,
  getCategoryLabel,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getLanguageBackground } from "@/lib/backgrounds/languageBackgrounds";
import { getProductsForCategory } from "@/lib/products";
import { useLocale } from "@/lib/i18n/context";
import MobileBreadcrumb from "./MobileBreadcrumb";
import MobileCategoryList from "./MobileCategoryList";
import MobileEmptyState from "./MobileEmptyState";

export default function MobileCategoryPage({ category }: { category: BuzzardCategory }) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const crumbs = getCategoryBreadcrumb(category.id);
  const name = getCategoryLabel(category, locale);
  const children = category.children ?? [];
  const productCount = getProductsForCategory(category).length;
  const photo = getLanguageBackground(locale);
  const parent = getCategoryAncestors(category.id).at(-1);
  const filtered = useMemo(() => {
    const list = category.children ?? [];
    const q = query.trim().toLocaleLowerCase(locale);
    if (!q) return list;
    return list.filter((child) => getCategoryLabel(child, locale).toLocaleLowerCase(locale).includes(q));
  }, [category, locale, query]);

  return (
    <div className="buzzard-mobile-only buzzard-mobile-shell">
      <div className="buzzard-mobile-content">
        <div className="buzzard-mobile-page-pad">
          <MobileBreadcrumb crumbs={crumbs} />
        </div>
        <section
          className="buzzard-mobile-category-hero"
          aria-label={name}
          style={
            photo
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.2) 0%, rgba(8,8,8,0.78) 100%), url("${photo}")`,
                }
              : undefined
          }
        >
          <h1 className="buzzard-mobile-page-title">{name}</h1>
          <p className="buzzard-mobile-page-count">
            {t("mobile.productCount").replace("{count}", String(productCount))}
          </p>
        </section>
        <div className="buzzard-mobile-page-pad">
          {children.length > 0 ? (
            <>
              <form className="buzzard-mobile-inline-search" onSubmit={(e) => e.preventDefault()} role="search">
                <input
                  className="buzzard-mobile-inline-search-input"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("mobile.categorySearchPlaceholder")}
                  aria-label={t("mobile.categorySearchPlaceholder")}
                />
              </form>
              {filtered.length > 0 ? (
                <MobileCategoryList categories={filtered} />
              ) : (
                <MobileEmptyState
                  title={t("mobile.emptyCategories")}
                  hint={t("mobile.emptyHint")}
                  backHref={parent ? categoryHref(parent) : "/"}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
