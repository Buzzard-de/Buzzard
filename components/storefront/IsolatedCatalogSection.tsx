import IsolatedCatalogBrowser from "@/components/storefront/IsolatedCatalogBrowser";
import { getIsolatedSnapshot, isolatedCatalogActive } from "@/lib/storefront/isolatedSnapshot";

export default function IsolatedCatalogSection() {
  const snapshot = getIsolatedSnapshot();
  if (!isolatedCatalogActive()) return null;
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
