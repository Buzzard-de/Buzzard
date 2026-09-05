import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import BrandsStrip from "@/components/BrandsStrip";
import { getDiversePopularCategories } from "@/lib/categories";
import { isSalesEnabled } from "@/lib/shop/mode";

const catalogTrust = [
  { label: "Große Kategorieauswahl", icon: "star" },
  { label: "Transparente Infos", icon: "box" },
  { label: "Support erreichbar", icon: "phone" },
  { label: "Persönliche Beratung", icon: "shield" },
] as const;

export default function HomeTrustReviews() {
  const highlights = getDiversePopularCategories(8);
  const salesOn = isSalesEnabled();

  return (
    <>
      <section className="home-section home-highlights" aria-labelledby="home-highlights-title">
        <div className="home-section-head">
          <h2 id="home-highlights-title">Beliebte Kategorien</h2>
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
        <h2 id="home-trust-title">{salesOn ? "Warum Buzzard?" : "Ihr Vorteil"}</h2>
        <div className="home-trust-grid">
          {catalogTrust.map((badge) => (
            <div key={badge.label} className="home-trust-item">
              <CategoryIcon name={badge.icon} size={24} />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
        <BrandsStrip variant="promo" />
      </section>

      {!salesOn && (
        <section className="home-section home-reviews" aria-labelledby="home-status-title">
          <h2 id="home-status-title">Shop-Status</h2>
          <div className="home-review-card">
            <p>
              Buzzard24 befindet sich im <strong>Katalogmodus</strong>. Produkte und Kategorien sind
              vollständig verfügbar — Preise folgen mit Verkaufsstart. Bis dahin senden Sie uns Ihre
              Anfrage über Hilfe & Kontakt.
            </p>
            <footer>
              <Link href="/hilfe/">Mehr erfahren → Hilfe & FAQ</Link>
            </footer>
          </div>
        </section>
      )}
    </>
  );
}
