"use client";

import Link from "next/link";
import {
  categoryHref,
  getCategoryBreadcrumb,
  getCategoryLabel,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";

interface CategoryCatalogViewProps {
  category: BuzzardCategory;
}

export default function CategoryCatalogView({ category }: CategoryCatalogViewProps) {
  const { locale, t } = useLocale();
  const breadcrumb = getCategoryBreadcrumb(category.id);
  const name = getCategoryLabel(category, locale);
  const children = category.children ?? [];

  return (
    <section className="page-hero">
      <div className="page-hero-inner">
        <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("category.home")}</Link>
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.id}>
              <span>/</span>
              {index === breadcrumb.length - 1 ? (
                <span>{getCategoryLabel(crumb, locale)}</span>
              ) : (
                <Link href={categoryHref(crumb)}>{getCategoryLabel(crumb, locale)}</Link>
              )}
            </span>
          ))}
        </nav>
        <h1>{name}</h1>
        {children.length > 0 && (
          <p>{t("category.subcount").replace("{count}", String(children.length))}</p>
        )}
      </div>
    </section>
  );
}
