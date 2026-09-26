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
} from "@/lib/categories";
import { useLocale } from "@/lib/i18n/context";
import type { BuzzardLocale } from "@/lib/i18n/types";
import type { BuzzardCategory } from "@/lib/categories/types";

interface FeaturedBannerProps {
  mainCategory?: BuzzardCategory;
  activeSubId: string;
}

function buildOffers(
  mainCategory: BuzzardCategory,
  activeSubId: string,
  locale: BuzzardLocale,
  t: (key: string) => string
): OfferCardData[] {
  const titles = [t("home.offerProfessional"), t("home.offerVehicle"), t("home.offerSafety")];
  const subs = getChildren(mainCategory.id).slice(0, 3);
  return subs.map((sub, index) => ({
    id: sub.id,
    title: titles[index] || t("home.offerFallback"),
    category: getCategoryLabel(activeSubId === sub.id ? getCategoryById(activeSubId) || sub : sub, locale),
    description: t("home.catalogDiscover").replace("{name}", getCategoryLabel(sub, locale)),
    href: categoryHref(sub),
    cta: t("home.offerCta"),
    icon: getMainCategoryIcon(mainCategory.id),
  }));
}

export default function FeaturedBanner({ mainCategory, activeSubId }: FeaturedBannerProps) {
  const { locale, t } = useLocale();
  const activeSub = activeSubId ? getCategoryById(activeSubId) : undefined;
  const offers = mainCategory ? buildOffers(mainCategory, activeSubId, locale, t) : [];

  return (
    <aside className="home-promo" aria-label={t("home.recommendations")}>
      {mainCategory && (
        <div className="promo-section promo-section--context">
          <h2 className="promo-title">{t("home.selectedCategory")}</h2>
          <p className="promo-context">{formatMenuLabel(mainCategory, locale)}</p>
          {activeSub && (
            <Link href={categoryHref(activeSub)} className="promo-all-link">
              {t("home.discoverCategory").replace("{name}", getCategoryLabel(activeSub, locale))}
            </Link>
          )}
          <Link href={categoryHref(mainCategory)} className="promo-all-link">
            {t("home.viewCategory")}
          </Link>
        </div>
      )}

      <OfferGrid offers={offers} />
    </aside>
  );
}
