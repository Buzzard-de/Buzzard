"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export default function MobileHero() {
  const { t } = useLocale();

  return (
    <section className="buzzard-mobile-hero" aria-label={t("mobile.heroAria")}>
      <h1>{t("mobile.heroTitle")}</h1>
      <p>{t("mobile.heroText")}</p>
      <Link href="/products/" className="buzzard-mobile-hero-cta">
        {t("mobile.startShopping")}
      </Link>
    </section>
  );
}
