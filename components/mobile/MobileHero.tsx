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
      <p className="buzzard-mobile-hero-kicker">{t("hero.kicker")}</p>
      <h1>{t("hero.title")}</h1>
      <p>{t("hero.text")}</p>
      <Link href="/products/" className="buzzard-mobile-hero-cta">
        {t("hero.cta")}
      </Link>
    </section>
  );
}
