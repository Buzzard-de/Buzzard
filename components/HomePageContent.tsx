"use client";

import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeTrustReviews from "./home/HomeTrustReviews";
import HomeLayout from "./HomeLayout";
import ServiceBar from "./ServiceBar";
import BuzzardServices from "./storefront/BuzzardServices";
import MobileVehicleSelector from "./mobile/MobileVehicleSelector";

/**
 * One homepage content tree for every viewport.
 * Phone/desktop differ only by CSS (.buzzard-mobile-only / .buzzard-desktop-chrome).
 * Do not mount a second phone-only homepage with its own hero/trust/category data.
 */
export default function HomePageContent() {
  return (
    <div className="home-page home-page-canonical">
      <div className="buzzard-mobile-only">
        <MobileVehicleSelector />
      </div>
      <HomeHeroCampaign />
      <HomeCategoryDiscovery />
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
