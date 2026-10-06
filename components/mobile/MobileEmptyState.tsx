"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

interface MobileEmptyStateProps {
  title: string;
  hint?: string;
  backHref?: string;
  searchHref?: string;
}

export default function MobileEmptyState({
  title,
  hint,
  backHref,
  searchHref = "/products/",
}: MobileEmptyStateProps) {
  const { t } = useLocale();

  return (
    <div className="buzzard-mobile-empty" role="status">
      <p className="buzzard-mobile-empty-title">{title}</p>
      {hint ? <p className="buzzard-mobile-empty-hint">{hint}</p> : null}
      <div className="buzzard-mobile-empty-actions">
        {backHref ? (
          <Link href={backHref} className="buzzard-mobile-empty-btn">
            {t("mobile.back")}
          </Link>
        ) : null}
        <Link href={searchHref} className="buzzard-mobile-empty-btn is-secondary">
          {t("header.search")}
        </Link>
      </div>
    </div>
  );
}
