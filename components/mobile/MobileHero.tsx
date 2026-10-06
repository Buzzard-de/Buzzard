"use client";

import Link from "next/link";
import { getMobileHeroStyle } from "@/lib/mobile/visuals";
import { useLocale } from "@/lib/i18n/context";

export default function MobileHero() {
  const { locale, t } = useLocale();
  const photoStyle = getMobileHeroStyle(locale);

  return (
    <section
      className={`buzzard-mobile-hero${photoStyle ? " has-locale-photo" : ""}`}
      aria-label={t("mobile.heroAria")}
      style={photoStyle}
    >
      <h1>{t("mobile.heroTitle")}</h1>
      <p>{t("mobile.heroText")}</p>
      <Link href="/products/" className="buzzard-mobile-hero-cta">
        {t("mobile.startShopping")}
      </Link>
    </section>
  );
}
