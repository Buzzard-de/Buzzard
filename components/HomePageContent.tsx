import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeTrustReviews from "./home/HomeTrustReviews";
import HomeLayout from "./HomeLayout";
import ServiceBar from "./ServiceBar";
import BuzzardServices from "./storefront/BuzzardServices";

export default function HomePageContent() {
  return (
    <div className="home-page">
      <HomeLayout />
      <HomeHeroCampaign />
      <HomeCategoryDiscovery />
      <HomeTrustReviews />
      <BuzzardServices />
      <HomeNewsletter />
      <ServiceBar />
    </div>
  );
}
