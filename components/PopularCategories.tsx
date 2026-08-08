import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import { homeCategories } from "@/lib/categories";

const iconMap: Record<string, string> = {
  reifen: "tire",
  oele: "oil",
  bremsen: "parts",
  batterien: "battery",
  filter: "filter",
  zuendung: "parts",
  wischer: "parts",
  pflege: "care",
};

export default function PopularCategories() {
  return (
    <section className="popular-categories" aria-label="Beliebte Kategorien">
      <h3 className="popular-categories-title">BELIEBTE KATEGORIEN</h3>
      <ul className="popular-categories-grid">
        {homeCategories.map((cat) => (
          <li key={cat.id}>
            <Link href={cat.href} className="popular-category-card">
              <span className="popular-category-icon">
                <CategoryIcon name={iconMap[cat.id] || "car"} size={28} />
              </span>
              <span className="popular-category-label">{cat.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
