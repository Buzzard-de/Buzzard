import Link from "next/link";
import CategoryIcon from "./CategoryIcon";
import { getFeaturedSubcategories, getMainCategoryIcon } from "@/lib/categories";

interface PopularCategoriesProps {
  mainCategoryId?: string;
}

export default function PopularCategories({ mainCategoryId = "cat-01" }: PopularCategoriesProps) {
  const cards = getFeaturedSubcategories(mainCategoryId, 6);

  if (cards.length === 0) return null;

  return (
    <section className="popular-categories" aria-label="Beliebte Kategorien">
      <h3 className="popular-categories-title">BELIEBTE KATEGORIEN</h3>
      <ul className="popular-categories-grid">
        {cards.map((cat) => (
          <li key={cat.id}>
            <Link href={cat.href} className="popular-category-card">
              <span className="popular-category-icon">
                <CategoryIcon name={getMainCategoryIcon(mainCategoryId)} size={28} />
              </span>
              <span className="popular-category-label">{cat.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
