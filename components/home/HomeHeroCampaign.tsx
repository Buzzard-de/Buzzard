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
      <div className="home-hero-visual" aria-hidden="true">
        <svg viewBox="0 0 320 140" fill="none" width="100%" height="100%">
          <rect x="20" y="70" width="280" height="40" rx="12" fill="#1a1a1a" stroke="#c9a066" strokeWidth="2" />
          <path d="M60 110 Q90 60 130 70 L190 70 Q230 60 260 110" stroke="#c9a066" strokeWidth="3" fill="none" />
          <circle cx="90" cy="110" r="18" fill="#111" stroke="#c9a066" strokeWidth="3" />
          <circle cx="230" cy="110" r="18" fill="#111" stroke="#c9a066" strokeWidth="3" />
        </svg>
      </div>
    </section>
  );
}
