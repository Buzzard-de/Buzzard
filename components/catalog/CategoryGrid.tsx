"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import type { AutomotiveCategoryNode } from "@/lib/automotive/service";
import { getAutomotiveCategoryLabel, getAutomotiveCategoryUrl } from "@/lib/automotive/service";

interface CategoryGridProps {
  categories: AutomotiveCategoryNode[];
  title?: string;
}

export default function CategoryGrid({ categories, title }: CategoryGridProps) {
  const { locale } = useLocale();

  if (!categories.length) return null;

  return (
    <section className="automotive-category-grid">
      {title ? <h2>{title}</h2> : null}
      <div className="automotive-category-grid-items">
        {categories.map((cat) => (
          <Link key={cat.id} href={getAutomotiveCategoryUrl(cat)} className="automotive-category-card">
            <h3>{getAutomotiveCategoryLabel(cat, locale)}</h3>
            {cat.children?.length ? (
              <p>
                {cat.children.length}{" "}
                {locale === "de"
                  ? "Unterkategorien"
                  : locale === "tr"
                    ? "alt kategori"
                    : locale === "ar"
                      ? "فئات فرعية"
                      : "subcategories"}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
