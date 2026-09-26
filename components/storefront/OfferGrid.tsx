import OfferCard, { type OfferCardData } from "./OfferCard";

interface OfferGridProps {
  title?: string;
  offers: OfferCardData[];
}

export default function OfferGrid({ title = "TOP ANGEBOTE", offers }: OfferGridProps) {
  if (offers.length === 0) return null;

  return (
    <section className="offer-grid" aria-label={title}>
      <h2 className="offer-grid-title">{title}</h2>
      <div className="offer-grid-list">
        {offers.map((offer) => (
          <OfferCard key={offer.id} {...offer} />
        ))}
      </div>
    </section>
  );
}
