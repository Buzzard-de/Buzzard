"use client";

import { useLocale } from "@/lib/i18n/context";

export default function EmptyCatalogState() {
  const { t } = useLocale();

  return (
    <div className="shop-empty automotive-empty-catalog" role="status">
      <h2>{t("automotive.empty.title")}</h2>
      <p>{t("automotive.empty.text")}</p>
    </div>
  );
}
