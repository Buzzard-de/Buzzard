"use client";

import JsonLd from "@/components/seo/JsonLd";
import type { BuzzardCategory } from "@/lib/categories/types";
import { useLocale } from "@/lib/i18n/context";
import { getCategoryLabel } from "@/lib/categories";
import { breadcrumbSchema, categoryBreadcrumbItems, categoryCollectionSchema } from "@/lib/seo/structured-data";

export default function CategoryJsonLd({
  category,
  breadcrumb,
}: {
  category: BuzzardCategory;
  breadcrumb: BuzzardCategory[];
}) {
  const { locale, t } = useLocale();
  const name = getCategoryLabel(category, locale);
  const description = t("category.jsonLdDescription").replace("{name}", name);

  return (
    <>
      <JsonLd data={breadcrumbSchema(categoryBreadcrumbItems(breadcrumb, locale, t("category.home")))} />
      <JsonLd data={categoryCollectionSchema(category, locale, description)} />
    </>
  );
}
