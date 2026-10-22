"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

export default function HomeHero() {
  const { t } = useLocale();

  return (
    <section className="home-hero" aria-label={t("mobile.heroAria")}>
      <div className="home-hero-content">
        <p className="home-hero-kicker">{t("hero.kicker")}</p>
        <h1 className="home-hero-title">{t("hero.title")}</h1>
        <p className="home-hero-text">{t("hero.text")}</p>
        <Link href="/products/" className="home-hero-btn">
          {t("hero.cta")}
        </Link>
      </div>
    </section>
  );
}
