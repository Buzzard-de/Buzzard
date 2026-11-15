import type { Metadata } from "next";
import IsolatedCatalogBrowser from "@/components/storefront/IsolatedCatalogBrowser";
import { getIsolatedSnapshot, isolatedCatalogActive } from "@/lib/storefront/isolatedSnapshot";
import { isolatedHreflang, isolatedProductSeo } from "@/lib/storefront/productSeo";

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = getIsolatedSnapshot().ids;
  return (ids.length ? ids : ["unavailable"]).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!isolatedCatalogActive()) return { title: "Buzzard", robots: { index: false, follow: false } };
  const seo = isolatedProductSeo(id, "de");
  const languages = Object.fromEntries(isolatedHreflang(id).links.map((link) => [link.locale, link.href]));
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical, languages },
    openGraph: { locale: seo.locale, title: seo.title, description: seo.description },
    robots: { index: false, follow: false },
  };
}

export default async function IsolatedProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      mode="detail"
      selected="ISOLATED"
      sales="SALES_CLOSED"
      locales={snapshot.locales}
      itemsByLocale={{}}
      detailByLocale={snapshot.detailByLocale[id] || {}}
      productId={id}
    />
  );
}
