import type { Metadata } from "next";
import IsolatedCatalogBrowser from "@/components/storefront/IsolatedCatalogBrowser";
import { LANGUAGE_CODES } from "@/lib/i18n/languages";
import { getIsolatedSnapshot, isolatedCatalogActive } from "@/lib/storefront/isolatedSnapshot";
import { isolatedHreflang, isolatedProductSeo } from "@/lib/storefront/productSeo";

export const dynamicParams = false;

export function generateStaticParams() {
  const snapshot = getIsolatedSnapshot();
  const params: Array<{ locale: string; id: string }> = [];
  for (const id of snapshot.ids) {
    for (const locale of LANGUAGE_CODES) {
      if (locale === "de") continue;
      if (isolatedProductSeo(id, locale).status === "PRESENT") params.push({ locale, id });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isolatedCatalogActive()) {
    return { title: "Buzzard", robots: { index: false, follow: false } };
  }
  const seo = isolatedProductSeo(id, locale);
  const languages = Object.fromEntries(isolatedHreflang(id).links.map((link) => [link.locale, link.href]));
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical, languages },
    openGraph: { locale: seo.locale, title: seo.title, description: seo.description },
    robots: { index: false, follow: false },
  };
}

export default async function LocalizedIsolatedProductPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const snapshot = getIsolatedSnapshot();
  if (!isolatedCatalogActive() || isolatedProductSeo(id, locale).status !== "PRESENT") {
    return (
      <section id="isolated-catalog" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} style={{ background: "#0b0b0b", color: "#f5f0e6", minHeight: "70vh", padding: 24 }}>
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
      routeLocale={locale}
    />
  );
}
