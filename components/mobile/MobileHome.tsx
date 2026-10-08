"use client";

import MobileHero from "./MobileHero";
import MobileCategoryGrid from "./MobileCategoryGrid";
import MobilePromoBanner from "./MobilePromoBanner";
import MobileTrustStrip from "./MobileTrustStrip";
import MobileVehicleSelector from "./MobileVehicleSelector";

/**
 * Legacy phone shell. Not mounted by app/page.tsx / HomePageContent.
 * Homepage rendering is HomeHeroCampaign + HomeCategoryDiscovery only.
 */
export default function MobileHome() {
  return (
    <div className="buzzard-mobile-only buzzard-mobile-shell">
      <div className="buzzard-mobile-content">
        <MobileVehicleSelector />
        <MobileHero />
        <MobileTrustStrip />
        <MobileCategoryGrid />
        <MobilePromoBanner />
      </div>
    </div>
  );
}
