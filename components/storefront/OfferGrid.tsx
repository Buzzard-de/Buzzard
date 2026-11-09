"use client";

import OfferCard, { type OfferCardData } from "./OfferCard";
import { useLocale } from "@/lib/i18n/context";

interface OfferGridProps {
  title?: string;
  offers: OfferCardData[];
}

export default function OfferGrid({ title, offers }: OfferGridProps) {
  const { t } = useLocale();
  const heading = title ?? t("home.topOffers");
  if (offers.length === 0) return null;

  return (
    <section className="offer-grid" aria-label={heading}>
      <h2 className="offer-grid-title">{heading}</h2>
      <div className="offer-grid-list">
        {offers.map((offer) => (
          <OfferCard key={offer.id} {...offer} />
        ))}
      </div>
    </section>
  );
}
