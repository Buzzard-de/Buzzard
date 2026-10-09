"use client";

import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeTrustReviews from "./home/HomeTrustReviews";
import HomeLayout from "./HomeLayout";
import ServiceBar from "./ServiceBar";
import BuzzardServices from "./storefront/BuzzardServices";
import MobileHomeCategoryRail from "./mobile/MobileHomeCategoryRail";
import MobileLocaleMarketBar from "./mobile/MobileLocaleMarketBar";
import MobileSearch from "./mobile/MobileSearch";

/**
 * One homepage content tree for every viewport.
 * Hero and category content stay canonical across viewports.
 * Phone-only controls add navigation chrome without a second homepage data source.
 * Do not mount a second phone-only homepage with its own hero/trust/category data.
 */
export default function HomePageContent() {
  return (
    <div className="home-page home-page-canonical">
      <div className="home-phone-layout">
        <MobileHomeCategoryRail />
        <div className="home-phone-main">
          <div className="buzzard-mobile-only home-phone-controls">
            <MobileLocaleMarketBar />
            <MobileSearch />
          </div>
          <HomeHeroCampaign />
          <HomeCategoryDiscovery />
        </div>
      </div>
      <div className="buzzard-desktop-chrome">
        <HomeLayout />
        <HomeTrustReviews />
        <BuzzardServices />
        <HomeNewsletter />
        <ServiceBar />
      </div>
    </div>
  );
}
