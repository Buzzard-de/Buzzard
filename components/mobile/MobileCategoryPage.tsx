"use client";

import CategoryIcon from "@/components/CategoryIcon";
import {
  getCategoryBreadcrumb,
  getCategoryLabel,
  getCategoryRowIcon,
  isCategoryInScope,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { getCategoryCoverImage, getMobileCoverStyle } from "@/lib/mobile/visuals";
import { getAllProducts } from "@/lib/products";
import { useLocale } from "@/lib/i18n/context";
import MobileBreadcrumb from "./MobileBreadcrumb";
import MobileCategoryList from "./MobileCategoryList";

export default function MobileCategoryPage({ category }: { category: BuzzardCategory }) {
  const { locale, t } = useLocale();
  const crumbs = getCategoryBreadcrumb(category.id);
  const name = getCategoryLabel(category, locale);
  const children = category.children ?? [];
  const productCount = getAllProducts().filter((product) =>
    isCategoryInScope(product.categoryId, category.id)
  ).length;

  return (
    <div className="buzzard-mobile-only buzzard-mobile-shell">
      <div className="buzzard-mobile-content">
        <div className="buzzard-mobile-page-pad">
          {crumbs.length > 1 ? <MobileBreadcrumb crumbs={crumbs} /> : null}
          <section className="buzzard-mobile-category-hero" aria-label={name}>
            <div className="buzzard-mobile-category-heading">
              <h1 className="buzzard-mobile-page-title">{name}</h1>
              <p className="buzzard-mobile-page-count">
                {t("mobile.productCount").replace("{count}", String(productCount))}
              </p>
            </div>
            <span
              className="buzzard-mobile-category-thumb"
              style={getMobileCoverStyle(category.id, getCategoryCoverImage(category))}
            >
              <CategoryIcon name={getCategoryRowIcon(category.id)} size={28} />
            </span>
          </section>
          {children.length > 0 ? <MobileCategoryList categories={children} /> : null}
        </div>
      </div>
    </div>
  );
}
