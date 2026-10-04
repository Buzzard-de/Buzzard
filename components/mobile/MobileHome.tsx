"use client";

import MobileHero from "./MobileHero";
import MobileCategoryGrid from "./MobileCategoryGrid";
import MobilePromoBanner from "./MobilePromoBanner";

export default function MobileHome() {
  return (
    <div className="buzzard-mobile-only buzzard-mobile-shell">
      <div className="buzzard-mobile-content">
        <MobileHero />
        <MobileCategoryGrid />
        <MobilePromoBanner />
      </div>
    </div>
  );
}
