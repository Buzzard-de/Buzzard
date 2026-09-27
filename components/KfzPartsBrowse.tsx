"use client";

import Link from "next/link";
import {
  getKfzMains,
  kfzMainHref,
  getShopL2Href,
  type KfzMainCategory,
} from "@/lib/categories/kfzTree";
import { useLocale } from "@/lib/i18n/context";

interface KfzPartsBrowseProps {
  compact?: boolean;
}

export default function KfzPartsBrowse({ compact = false }: KfzPartsBrowseProps) {
  const { t } = useLocale();
  const mains = getKfzMains();
  const subcategoryTotal = mains.reduce((sum, m) => sum + m.subcategory_count, 0);

  return (
    <section className="subpage-content kfz-parts-browse">
      <div className="kfz-parts-header">
        <h2>KFZ-Teilebaum</h2>
        <p>
          {mains.length} technische Hauptsysteme mit{" "}
          {t("category.subcount").replace("{count}", String(subcategoryTotal))}
          {mains[0]?.l3_count !== undefined && (
            <> und {mains.reduce((sum, m) => sum + (m.l3_count ?? 0), 0)} L3-Produktgruppen</>
          )}{" "}
          — direkt mit dem Automotive-Shop verknüpft.
        </p>
        {!compact && (
          <Link href="/kategorie/automotive/kfz/" className="shop-btn-secondary">
            Gesamten KFZ-Baum öffnen
          </Link>
        )}
        <Link href="/kategorie/automotive/" className="shop-btn-secondary">
          Zum Automotive-Shop
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
  const { t } = useLocale();
  const shopHref = getShopL2Href(main);

  return (
    <article className="kfz-parts-card">
      <Link href={kfzMainHref(main)} className="kfz-parts-card-title">
        <span className="kfz-parts-id">{main.kfz_id}</span>
        {main.name_de}
      </Link>
      <p className="kfz-parts-meta">
        {t("category.subcount").replace("{count}", String(main.subcategory_count))}
        {main.l3_count ? ` · ${main.l3_count} L3` : ""}
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
