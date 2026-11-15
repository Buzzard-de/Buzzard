"use client";

import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import PopularCategories from "./PopularCategories";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryLabel,
  getChildren,
  getMainCategoryIcon,
  splitSubcategoriesIntoColumns,
} from "@/lib/categories";
import { useLocale } from "@/lib/i18n/context";
import type { BuzzardLocale } from "@/lib/i18n/types";
import type { BuzzardCategory } from "@/lib/categories/types";

interface MegaMenuProps {
  mainCategory?: BuzzardCategory;
  subCategories: BuzzardCategory[];
  activeSubId: string;
  onSubSelect: (subId: string) => void;
}

function SubcategoryGroup({
  sub,
  mainCategory,
  activeSubId,
  onSubSelect,
  locale,
}: {
  sub: BuzzardCategory;
  mainCategory: BuzzardCategory;
  activeSubId: string;
  onSubSelect: (subId: string) => void;
  locale: BuzzardLocale;
}) {
  const level3 = activeSubId === sub.id ? getChildren(sub.id) : [];

  return (
    <li role="listitem" className="subcategory-group">
      <Link
        href={categoryHref(sub)}
        className={`subcategory-link${activeSubId === sub.id ? " active" : ""}`}
        onMouseEnter={() => onSubSelect(sub.id)}
        onFocus={() => onSubSelect(sub.id)}
      >
        <CategoryIcon name={getMainCategoryIcon(mainCategory.id)} size={16} />
        <span>{getCategoryLabel(sub, locale)}</span>
      </Link>
      {level3.length > 0 && (
        <ul className="subsubcategory-list" role="list">
          {level3.map((child) => (
            <li key={child.id} role="listitem">
              <Link href={categoryHref(child)} className="subsubcategory-link">
                <span className="subsubcategory-id">{child.menu_order}.</span>
                <span>{getCategoryLabel(child, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MegaMenu({
  mainCategory,
  subCategories,
  activeSubId,
  onSubSelect,
}: MegaMenuProps) {
  const { locale, t } = useLocale();
  if (!mainCategory) return null;

  const columns = splitSubcategoriesIntoColumns(subCategories, subCategories.length > 8 ? 3 : 2);

  return (
    <section className="mega-panel" aria-label={getCategoryLabel(mainCategory, locale)}>
      <div className="mega-panel-head">
        <h2 className="mega-panel-title">{formatMenuLabel(mainCategory, locale)}</h2>
        <Link href={categoryHref(mainCategory)} className="mega-panel-all-link">
          {t("home.showAll")}
        </Link>
      </div>
      <p className="mega-panel-subtitle">{t("home.subcategories")}</p>

      <div className="subcategory-columns" role="list">
        {columns.map((column, columnIndex) => (
          <ul key={columnIndex} className="subcategory-column" role="list">
            {column.map((sub) => (
              <SubcategoryGroup
                key={sub.id}
                sub={sub}
                mainCategory={mainCategory}
                activeSubId={activeSubId}
                onSubSelect={onSubSelect}
                locale={locale}
              />
            ))}
          </ul>
        ))}
      </div>

      <PopularCategories mainCategoryId={mainCategory.id} />
    </section>
  );
}
