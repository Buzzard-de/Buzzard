import HomeCategoryDiscovery from "./home/HomeCategoryDiscovery";
import HomeHeroCampaign from "./home/HomeHeroCampaign";
import HomeNewsletter from "./home/HomeNewsletter";
import HomeTrustReviews from "./home/HomeTrustReviews";
import HomeLayout from "./HomeLayout";
import ServiceBar from "./ServiceBar";
import BuzzardServices from "./storefront/BuzzardServices";
import MobileHome from "./mobile/MobileHome";

export default function HomePageContent() {
  return (
    <div className="home-page">
      <div className="buzzard-desktop-chrome">
        <HomeLayout />
        <HomeHeroCampaign />
        <HomeCategoryDiscovery />
        <HomeTrustReviews />
        <BuzzardServices />
        <HomeNewsletter />
        <ServiceBar />
      </div>
      <MobileHome />
    </div>
  );
}
