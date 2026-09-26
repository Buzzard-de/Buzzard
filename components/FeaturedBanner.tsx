"use client";

import Link from "next/link";
import OfferGrid from "@/components/storefront/OfferGrid";
import type { OfferCardData } from "@/components/storefront/OfferCard";
import {
  categoryHref,
  formatMenuLabel,
  getCategoryById,
  getCategoryLabel,
  getChildren,
  getMainCategoryIcon,
  DEFAULT_LOCALE,
} from "@/lib/categories";
import type { BuzzardCategory } from "@/lib/categories/types";

interface FeaturedBannerProps {
  mainCategory?: BuzzardCategory;
  activeSubId: string;
}

const GENERIC_TITLES = [
  "Professionelle Lösungen",
  "Fahrzeugtechnik",
  "Arbeits- & Sicherheitsausrüstung",
];

function buildOffers(mainCategory: BuzzardCategory, activeSubId: string): OfferCardData[] {
  const subs = getChildren(mainCategory.id).slice(0, 3);
  return subs.map((sub, index) => ({
    id: sub.id,
    title: GENERIC_TITLES[index] || "Katalogbereich",
    category: getCategoryLabel(activeSubId === sub.id ? getCategoryById(activeSubId) || sub : sub, DEFAULT_LOCALE),
    description: `${getCategoryLabel(sub, DEFAULT_LOCALE)} im Buzzard-Katalog entdecken.`,
    href: categoryHref(sub),
    cta: "Jetzt entdecken",
    icon: getMainCategoryIcon(mainCategory.id),
  }));
}

export default function FeaturedBanner({ mainCategory, activeSubId }: FeaturedBannerProps) {
  const activeSub = activeSubId ? getCategoryById(activeSubId) : undefined;
  const offers = mainCategory ? buildOffers(mainCategory, activeSubId) : [];

  return (
    <aside className="home-promo" aria-label="Empfehlungen">
      {mainCategory && (
        <div className="promo-section promo-section--context">
          <h2 className="promo-title">AUSGEWÄHLTE KATEGORIE</h2>
          <p className="promo-context">{formatMenuLabel(mainCategory, DEFAULT_LOCALE)}</p>
          {activeSub && (
            <Link href={categoryHref(activeSub)} className="promo-all-link">
              {getCategoryLabel(activeSub, DEFAULT_LOCALE)} entdecken →
            </Link>
          )}
          <Link href={categoryHref(mainCategory)} className="promo-all-link">
            Gesamte Kategorie ansehen →
          </Link>
        </div>
      )}

      <OfferGrid offers={offers} />
    </aside>
  );
}
