"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";
import type { AutomotiveCategoryNode } from "@/lib/automotive/service";
import { getAutomotiveCategoryLabel, getAutomotiveCategoryUrl } from "@/lib/automotive/service";

interface CategoryBreadcrumbsProps {
  chain: AutomotiveCategoryNode[];
  homeLabel?: string;
}

export default function CategoryBreadcrumbs({ chain, homeLabel }: CategoryBreadcrumbsProps) {
  const { locale, t } = useLocale();
  const home = homeLabel || t("automotive.breadcrumb.home");

  return (
    <nav className="page-hero-breadcrumb" aria-label="Breadcrumb">
      <Link href="/">{home}</Link>
      {chain.map((node, index) => {
        const label = getAutomotiveCategoryLabel(node, locale);
        const isLast = index === chain.length - 1;
        return (
          <span key={node.id}>
            <span> / </span>
            {isLast ? (
              <span aria-current="page">{label}</span>
            ) : (
              <Link href={getAutomotiveCategoryUrl(node)}>{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
