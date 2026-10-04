"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export default function CategoryNotFound() {
  const { t } = useLocale();
  return (
    <section className="shop-page">
      <div className="shop-empty">
        <h1>{t("category.notFound")}</h1>
        <Link href="/" className="shop-btn-primary">
          {t("category.backHome")}
        </Link>
      </div>
    </section>
  );
}
