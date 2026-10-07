"use client";

import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeTrustReviews from "./home/HomeTrustReviews";
import HomeLayout from "./HomeLayout";
import ServiceBar from "./ServiceBar";
import BuzzardServices from "./storefront/BuzzardServices";
import MobileHome from "./mobile/MobileHome";
import { useIsMobileNav } from "@/lib/use-media-query";

export default function HomePageContent() {
  const isPhone = useIsMobileNav();

  return (
    <div className="home-page">
      {!isPhone ? (
        <div className="buzzard-desktop-chrome">
          <HomeHeroCampaign />
          <HomeLayout />
          <HomeCategoryDiscovery />
          <HomeTrustReviews />
          <BuzzardServices />
          <HomeNewsletter />
          <ServiceBar />
        </div>
      ) : null}
      <MobileHome />
    </div>
  );
}
