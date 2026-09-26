"use client";

import Link from "next/link";
import { categoryHref, getCategoryLabel } from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";

export default function CategoryChildrenGrid({ children }: { children: BuzzardCategory[] }) {
  const { locale } = useLocale();
  if (children.length === 0) return null;

  return (
    <section className="subpage-content category-children-grid">
      {children.map((child) => (
        <Link key={child.id} href={categoryHref(child)} className="category-child-card">
          {getCategoryLabel(child, locale)}
        </Link>
      ))}
    </section>
  );
}
