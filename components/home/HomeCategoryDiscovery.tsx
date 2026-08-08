import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryById,
  getMainCategoryIcon,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import { getHomeFeaturedCategoryIds } from "@/lib/navigation/home-config";

export default function HomeCategoryDiscovery() {
  const ids = getHomeFeaturedCategoryIds(12);

  return (
    <section className="home-section home-category-discovery" aria-labelledby="home-categories-title">
      <div className="home-section-head">
        <h2 id="home-categories-title">Kategorien entdecken</h2>
        <Link href="/products/" className="home-section-link">
          Alle Kategorien ansehen →
        </Link>
      </div>
      <div className="home-category-grid">
        {ids.map((id) => {
          const cat = getCategoryById(id);
          if (!cat) return null;
          return (
            <Link key={id} href={categoryHref(cat)} className="home-category-tile">
              <span className="home-category-tile-icon">
                <CategoryIcon name={getMainCategoryIcon(id)} size={28} />
              </span>
              <span className="home-category-tile-label">{formatMenuLabel(cat, DEFAULT_LOCALE)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
