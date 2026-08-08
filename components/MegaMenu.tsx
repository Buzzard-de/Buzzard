"use client";

import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import BrandsStrip from "./BrandsStrip";
import PopularCategories from "./PopularCategories";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryLabel,
  getMainCategoryIcon,
  splitSubcategoriesIntoColumns,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";

interface MegaMenuProps {
  mainCategory?: BuzzardCategory;
  subCategories: BuzzardCategory[];
  activeSubId: string;
  onSubSelect: (subId: string) => void;
}

export default function MegaMenu({
  mainCategory,
  subCategories,
  activeSubId,
  onSubSelect,
}: MegaMenuProps) {
  if (!mainCategory) return null;

  const columns = splitSubcategoriesIntoColumns(subCategories, subCategories.length > 8 ? 3 : 2);

  return (
    <section className="mega-panel" aria-label={getCategoryLabel(mainCategory, DEFAULT_LOCALE)}>
      <div className="mega-panel-head">
        <h2 className="mega-panel-title">{formatMenuLabel(mainCategory, DEFAULT_LOCALE)}</h2>
        <Link href={categoryHref(mainCategory)} className="mega-panel-all-link">
          Alle anzeigen →
        </Link>
      </div>
      <p className="mega-panel-subtitle">Unterkategorien</p>

      <div className="subcategory-columns" role="list">
        {columns.map((column, columnIndex) => (
          <ul key={columnIndex} className="subcategory-column" role="list">
            {column.map((sub) => (
              <li key={sub.id} role="listitem">
                <Link
                  href={categoryHref(sub)}
                  className={`subcategory-link${activeSubId === sub.id ? " active" : ""}`}
                  onMouseEnter={() => onSubSelect(sub.id)}
                  onFocus={() => onSubSelect(sub.id)}
                >
                  <CategoryIcon name={getMainCategoryIcon(mainCategory.id)} size={16} />
                  <span>{getCategoryLabel(sub, DEFAULT_LOCALE)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </div>

      {mainCategory.id === "cat-01" && (
        <>
          <PopularCategories />
          <BrandsStrip variant="mega" />
        </>
      )}
    </section>
  );
}
