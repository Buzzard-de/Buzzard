"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export default function NotFoundContent() {
  const { t } = useLocale();

  return (
    <section className="error-page">
      <h1>404</h1>
      <h2>{t("errors.pageTitle")}</h2>
      <p>{t("errors.pageText")}</p>
      <div className="error-page-btns">
        <Link href="/" className="btn-primary">
          {t("errors.backHome")}
        </Link>
        <Link href="/products/" className="btn-secondary">
          {t("errors.viewProducts")}
        </Link>
      </div>
    </section>
  );
}
