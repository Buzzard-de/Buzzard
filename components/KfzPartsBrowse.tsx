import Link from "next/link";
import {
  getKfzMains,
  kfzMainHref,
  getShopL2Href,
  type KfzMainCategory,
} from "@/lib/categories/kfzTree";

interface KfzPartsBrowseProps {
  compact?: boolean;
}

export default function KfzPartsBrowse({ compact = false }: KfzPartsBrowseProps) {
  const mains = getKfzMains();

  return (
    <section className="subpage-content kfz-parts-browse">
      <div className="kfz-parts-header">
        <h2>KFZ-Teilebaum</h2>
        <p>
          {mains.length} technische Hauptsysteme mit{" "}
          {mains.reduce((sum, m) => sum + m.subcategory_count, 0)} Unterkategorien
          {mains[0]?.l3_count !== undefined && (
            <> und {mains.reduce((sum, m) => sum + (m.l3_count ?? 0), 0)} L3-Produktgruppen</>
          )}{" "}
          — Kfz Intelligence OS, verknüpft mit dem Shop unter Automotive.
        </p>
        {!compact && (
          <Link href="/kategorie/automotive/kfz/" className="shop-btn-secondary">
            Gesamten KFZ-Baum öffnen
          </Link>
        )}
        <Link href="/taxonomy/buzzard_master_kfz_intelligence_os.html" className="shop-btn-secondary" target="_blank" rel="noopener noreferrer">
          Intelligence OS Console
        </Link>
      </div>
      <div className="kfz-parts-grid">
        {mains.slice(0, compact ? 12 : mains.length).map((main) => (
          <KfzMainCard key={main.kfz_id} main={main} />
        ))}
      </div>
    </section>
  );
}

function KfzMainCard({ main }: { main: KfzMainCategory }) {
  const shopHref = getShopL2Href(main);

  return (
    <article className="kfz-parts-card">
      <Link href={kfzMainHref(main)} className="kfz-parts-card-title">
        <span className="kfz-parts-id">{main.kfz_id}</span>
        {main.name_de}
      </Link>
      <p className="kfz-parts-meta">
        {main.subcategory_count} Unterkategorien
        {main.l3_count ? ` · ${main.l3_count} L3` : ""}
        {main.active_competitors && main.active_competitors.length > 0 && (
          <> · {main.active_competitors.length} Wettbewerber</>
        )}
        {shopHref && (
          <>
            {" · "}
            <Link href={shopHref}>Shop: {main.shop_l2_name}</Link>
          </>
        )}
      </p>
    </article>
  );
}
