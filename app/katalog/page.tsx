import IsolatedCatalogBrowser from "@/components/storefront/IsolatedCatalogBrowser";
import { getIsolatedSnapshot, isolatedCatalogActive } from "@/lib/storefront/isolatedSnapshot";

export const metadata = { title: "Buzzard Katalog", robots: { index: false, follow: false } };

export default function IsolatedCatalogPage() {
  const snapshot = getIsolatedSnapshot();
  const enabled = isolatedCatalogActive();
  if (!enabled) {
    return (
      <section id="isolated-catalog" style={{ background: "#0b0b0b", color: "#f5f0e6", minHeight: "70vh", padding: 24 }}>
        <p role="status">EXISTING_SAFE</p>
        <p>SALES_CLOSED</p>
      </section>
    );
  }
  return (
    <IsolatedCatalogBrowser
      mode="list"
      selected={snapshot.selected}
      sales={snapshot.sales}
      locales={snapshot.locales}
      itemsByLocale={snapshot.itemsByLocale}
    />
  );
}
