"use client";

import Link from "next/link";
import { categoryHref, getCategoryLabel } from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";

export default function MobileBreadcrumb({ crumbs }: { crumbs: BuzzardCategory[] }) {
  const { locale, t } = useLocale();

  return (
    <nav className="buzzard-mobile-breadcrumb" aria-label={t("mobile.breadcrumb")}>
      <Link href="/">{t("category.home")}</Link>
      {crumbs.map((crumb, index) => (
        <span key={crumb.id} className="buzzard-mobile-breadcrumb-item">
          <span aria-hidden="true">›</span>
          {index === crumbs.length - 1 ? (
            <span aria-current="page">{getCategoryLabel(crumb, locale)}</span>
          ) : (
            <Link href={categoryHref(crumb)}>{getCategoryLabel(crumb, locale)}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
