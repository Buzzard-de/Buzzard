import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";

export interface OfferCardData {
  id: string;
  title: string;
  category: string;
  description: string;
  href: string;
  cta?: string;
  icon?: string;
}

export default function OfferCard({
  title,
  category,
  description,
  href,
  cta = "Jetzt entdecken",
  icon = "box",
}: OfferCardData) {
  return (
    <article className="offer-card">
      <div className="offer-card-visual" aria-hidden="true">
        <span className="offer-card-pattern" />
        <CategoryIcon name={icon} size={36} />
      </div>
      <div className="offer-card-body">
        <p className="offer-card-category">{category}</p>
        <h3 className="offer-card-title">{title}</h3>
        <p className="offer-card-text">{description}</p>
        <Link href={href} className="offer-card-cta">
          {cta}
        </Link>
      </div>
    </article>
  );
}
