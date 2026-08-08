import HomeCampaigns from "./home/HomeCampaigns";
import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeProductRail from "./home/HomeProductRail";
import HomeTrustReviews from "./home/HomeTrustReviews";
import ServiceBar from "./ServiceBar";

export default function HomePageContent() {
  return (
    <div className="home-page">
      <HomeHeroCampaign />
      <HomeCategoryDiscovery />
      <HomeProductRail variant="featured" title="Empfohlene Produkte" limit={4} />
      <HomeProductRail variant="bestsellers" title="Bestseller" limit={4} />
      <HomeCampaigns />
      <HomeProductRail variant="new" title="Neuheiten" limit={4} />
      <HomeTrustReviews />
      <HomeNewsletter />
      <ServiceBar />
    </div>
  );
}
