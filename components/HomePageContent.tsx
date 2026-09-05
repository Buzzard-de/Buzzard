"use client";

import HomeCampaigns from "./home/HomeCampaigns";
import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeProductRail from "./home/HomeProductRail";
import HomeTrustReviews from "./home/HomeTrustReviews";
import ServiceBar from "./ServiceBar";
import { useLocale } from "@/lib/i18n/context";

export default function HomePageContent() {
  const { t } = useLocale();

  return (
    <div className="home-page">
      <HomeHeroCampaign />
      <HomeCategoryDiscovery />
      <HomeProductRail variant="featured" title={t("home.featured")} limit={6} />
      <HomeProductRail variant="bestsellers" title={t("home.bestsellers")} limit={6} />
      <HomeCampaigns />
      <HomeProductRail variant="new" title={t("homeRails.new")} limit={4} />
      <HomeTrustReviews />
      <HomeNewsletter />
      <ServiceBar />
    </div>
  );
}
