"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import type { AutomotiveCategoryNode } from "@/lib/automotive/service";
import { getAutomotiveCategoryLabel, getAutomotiveCategoryUrl } from "@/lib/automotive/service";

interface CategoryNavigationProps {
  title?: string;
  categories: AutomotiveCategoryNode[];
  currentId?: string;
}

export default function CategoryNavigation({ title, categories, currentId }: CategoryNavigationProps) {
  const { locale, t } = useLocale();

  if (!categories.length) return null;

  return (
    <nav className="automotive-category-nav" aria-label={title || t("automotive.nav.subcategories")}>
      {title ? <h2 className="automotive-category-nav-title">{title}</h2> : null}
      <ul className="automotive-category-nav-list">
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={getAutomotiveCategoryUrl(cat)}
              className={currentId === cat.id ? "is-active" : undefined}
              aria-current={currentId === cat.id ? "page" : undefined}
            >
              {getAutomotiveCategoryLabel(cat, locale)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
