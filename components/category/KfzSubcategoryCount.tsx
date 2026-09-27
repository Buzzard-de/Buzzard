"use client";

import { useLocale } from "@/lib/i18n/context";

export default function KfzSubcategoryCount({ count }: { count: number }) {
  const { t } = useLocale();
  return <>{t("category.subcount").replace("{count}", String(count))}</>;
}
