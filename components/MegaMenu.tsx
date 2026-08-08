"use client";

import CategoryIcon from "./CategoryIcon";
import BrandsStrip from "./BrandsStrip";
import PopularCategories from "./PopularCategories";
import { formatCategoryLabel } from "@/lib/categories";
import type { CategoryTreeNode } from "@/types";

interface MegaMenuProps {
  mainCategory?: CategoryTreeNode;
  subCategories: CategoryTreeNode[];
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

  return (
    <section className="mega-panel" aria-label={mainCategory.label}>
      <h2 className="mega-panel-title">{formatCategoryLabel(mainCategory)}</h2>
      <p className="mega-panel-subtitle">Unterkategorien</p>

      <ul className="subcategory-list">
        {subCategories.map((sub) => (
          <li key={sub.id}>
            <button
              type="button"
              className={`subcategory-item${activeSubId === sub.id ? " active" : ""}`}
              onClick={() => onSubSelect(sub.id)}
            >
              {sub.icon && <CategoryIcon name={sub.icon} size={18} />}
              <span className="subcategory-label">{formatCategoryLabel(sub)}</span>
              <svg
                className="chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="14"
                height="14"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {mainCategory.id === "01" && (
        <>
          <PopularCategories />
          <BrandsStrip variant="mega" />
        </>
      )}
    </section>
  );
}
