"use client";

import Link from "next/link";
import { useHomeUI } from "@/lib/home-ui";
import { useLocale } from "@/lib/i18n/context";
import { getMobileHeroStyle } from "@/lib/mobile/visuals";
import { useMarket } from "@/lib/market/context";
import { useIsMobileNav } from "@/lib/use-media-query";

export default function HomeHeroCampaign() {
  const homeUI = useHomeUI();
  const { locale, t } = useLocale();
  const { countryCode } = useMarket();
  const isPhone = useIsMobileNav();
  const photoStyle = getMobileHeroStyle(locale, isPhone ? countryCode : null);

  return (
    <section
      className={`home-hero home-hero-campaign${photoStyle ? " has-locale-photo" : ""}`}
      aria-label={t("mobile.heroAria")}
      style={photoStyle}
    >
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
