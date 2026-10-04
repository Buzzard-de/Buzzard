"use client";

import { useMemo, useState } from "react";
import {
  getCategoryBreadcrumb,
  getCategoryLabel,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getProductsForCategory } from "@/lib/products";
import { useLocale } from "@/lib/i18n/context";
import MobileBreadcrumb from "./MobileBreadcrumb";
import MobileCategoryList from "./MobileCategoryList";

export default function MobileCategoryPage({ category }: { category: BuzzardCategory }) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const crumbs = getCategoryBreadcrumb(category.id);
  const name = getCategoryLabel(category, locale);
  const children = category.children ?? [];
  const productCount = getProductsForCategory(category).length;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    if (!q) return children;
    return children.filter((child) => getCategoryLabel(child, locale).toLocaleLowerCase(locale).includes(q));
  }, [children, locale, query]);

  return (
    <div className="buzzard-mobile-only buzzard-mobile-shell">
      <div className="buzzard-mobile-content">
        <MobileBreadcrumb crumbs={crumbs} />
        <h1 className="buzzard-mobile-page-title">{name}</h1>
        <p className="buzzard-mobile-page-count">
          {t("mobile.productCount").replace("{count}", String(productCount))}
        </p>
        {children.length > 0 ? (
          <>
            <div className="buzzard-mobile-search" style={{ padding: "0 0 12px" }}>
              <form className="buzzard-mobile-search-form" onSubmit={(e) => e.preventDefault()} role="search">
                <input
                  className="buzzard-mobile-search-input"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("mobile.categorySearchPlaceholder")}
                  aria-label={t("mobile.categorySearchPlaceholder")}
                />
              </form>
            </div>
            <MobileCategoryList categories={filtered} />
          </>
        ) : null}
      </div>
    </div>
  );
}
