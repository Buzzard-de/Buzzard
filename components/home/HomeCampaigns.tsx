import Link from "next/link";
import ProductSvg from "@/components/ProductSvg";
import { homeCampaigns } from "@/lib/navigation/home-config";

export default function HomeCampaigns() {
  return (
    <section className="home-section home-campaigns" aria-labelledby="home-campaigns-title">
      <div className="home-section-head">
        <h2 id="home-campaigns-title">Aktionen &amp; Angebote</h2>
      </div>
      <div className="home-campaign-grid">
        {homeCampaigns.map((camp) => (
          <Link key={camp.id} href={camp.href} className="home-campaign-card">
            <div className="home-campaign-visual">
              <ProductSvg imageKey={camp.imageKey} />
            </div>
            <div className="home-campaign-body">
              <span className="home-campaign-tag">{camp.tag}</span>
              <strong>{camp.title}</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
