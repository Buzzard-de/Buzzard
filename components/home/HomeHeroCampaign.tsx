"use client";

import Link from "next/link";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";

export default function HomeHeroCampaign() {
  const homeUI = useHomeUI();
  const { t } = useLocale();

  return (
    <section className="home-hero home-hero-campaign" aria-label="Hero">
      <div className="home-hero-content">
        <p className="home-hero-kicker">{t("hero.kicker")}</p>
        <h1 className="home-hero-title">{t("hero.title")}</h1>
        <p className="home-hero-text">{t("hero.text")}</p>
        <div className="home-hero-actions">
          <Link href="/products/" className="home-hero-btn">
            {t("hero.cta")}
          </Link>
          <button type="button" className="home-hero-btn home-hero-btn--secondary" onClick={homeUI?.openMegaMenu}>
            {t("hero.secondary")}
          </button>
        </div>
      </div>
    </section>
  );
}
