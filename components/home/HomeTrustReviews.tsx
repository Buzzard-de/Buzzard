"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import { getDiversePopularCategories } from "@/lib/categories";
import { isSalesEnabled } from "@/lib/shop/mode";
import { useLocale } from "@/lib/i18n/context";

const catalogTrust = [
  { key: "home.trustChoice", icon: "star" },
  { key: "home.trustInfo", icon: "box" },
  { key: "home.trustSupport", icon: "phone" },
  { key: "home.trustAdvice", icon: "shield" },
] as const;

export default function HomeTrustReviews() {
  const { locale, t } = useLocale();
  const highlights = getDiversePopularCategories(8, locale);
  const salesOn = isSalesEnabled();

  return (
    <>
      <section className="home-section home-highlights" aria-labelledby="home-highlights-title">
        <div className="home-section-head">
          <h2 id="home-highlights-title">{t("home.highlights")}</h2>
        </div>
        <ul className="popular-categories-grid">
          {highlights.map((cat) => (
            <li key={cat.id}>
              <Link href={cat.href} className="popular-category-card">
                <span className="popular-category-icon">
                  <CategoryIcon name={cat.icon} size={28} />
                </span>
                <span className="popular-category-label">{cat.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="home-section home-trust" aria-labelledby="home-trust-title">
        <h2 id="home-trust-title">{salesOn ? t("home.trustSales") : t("home.trust")}</h2>
        <div className="home-trust-grid">
          {catalogTrust.map((badge) => (
            <div key={badge.key} className="home-trust-item">
              <CategoryIcon name={badge.icon} size={24} />
              <span>{t(badge.key)}</span>
            </div>
          ))}
        </div>
      </section>

      {!salesOn && (
        <section className="home-section home-reviews" aria-labelledby="home-status-title">
          <h2 id="home-status-title">{t("home.statusTitle")}</h2>
          <div className="home-review-card">
            <p>{t("home.statusText")}</p>
            <footer>
              <Link href="/hilfe/">{t("home.learnMore")}</Link>
            </footer>
          </div>
        </section>
      )}
    </>
  );
}
