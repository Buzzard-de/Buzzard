import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import BrandsStrip from "@/components/BrandsStrip";
import { getFeaturedSubcategories } from "@/lib/categories";
import { homeReviews } from "@/lib/navigation/home-config";
import { trustBadges } from "@/lib/categories";

export default function HomeTrustReviews() {
  const highlights = getFeaturedSubcategories("cat-01", 6);

  return (
    <>
      <section className="home-section home-highlights" aria-labelledby="home-highlights-title">
        <div className="home-section-head">
          <h2 id="home-highlights-title">Beliebte Kategorien</h2>
        </div>
        <div className="popular-categories-grid">
          {highlights.map((cat) => (
            <Link key={cat.id} href={cat.href} className="popular-category-card">
              <span className="popular-category-label">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section home-trust" aria-labelledby="home-trust-title">
        <h2 id="home-trust-title">Warum Buzzard?</h2>
        <div className="home-trust-grid">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="home-trust-item">
              <CategoryIcon name={badge.icon} size={24} />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
        <BrandsStrip variant="promo" />
      </section>

      <section className="home-section home-reviews" aria-labelledby="home-reviews-title">
        <h2 id="home-reviews-title">Kundenstimmen</h2>
        <div className="home-reviews-grid">
          {homeReviews.map((review) => (
            <blockquote key={review.id} className="home-review-card">
              <p>{review.text}</p>
              <footer>
                {"★".repeat(review.rating)} · {review.name}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
    </>
  );
}
