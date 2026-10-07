"use client";

import Link from "next/link";
import { HOME_CATALOG_HREF } from "@/lib/home/homepageContent";
import { useLocale } from "@/lib/i18n/context";

/** Catalog discovery only — no fabricated promotions, prices, or discounts. */
export default function HomeCampaigns() {
  const { t } = useLocale();

  return (
    <section className="home-section home-campaigns" aria-labelledby="home-campaigns-title">
      <div className="home-section-head">
        <h2 id="home-campaigns-title">{t("home.campaigns")}</h2>
      </div>
      <Link href={HOME_CATALOG_HREF} className="home-campaign-card">
        <div className="home-campaign-body">
          <strong>{t("hero.title")}</strong>
          <span>{t("hero.secondary")}</span>
        </div>
      </Link>
    </section>
  );
}
