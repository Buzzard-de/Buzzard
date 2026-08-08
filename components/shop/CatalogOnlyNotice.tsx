"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export default function CatalogOnlyNotice() {
  const { t } = useLocale();
  return (
    <div className="shop-empty">
      <h1>{t("catalog.browseOnlyTitle")}</h1>
      <p>{t("catalog.browseOnlyText")}</p>
      <Link href="/products/" className="shop-btn-primary">
        {t("product.allProducts")}
      </Link>
    </div>
  );
}
