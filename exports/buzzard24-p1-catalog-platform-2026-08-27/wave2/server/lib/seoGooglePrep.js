/** SEO / Google readiness report (P1-12). Extends existing sitemap/feed — no rebuild. */

const fs = require("fs");
const path = require("path");
const productStore = require("./productStore");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(/\/$/, "");
const API_URL = (process.env.BUZZARD_API_URL || "https://buzzard-api.onrender.com").replace(/\/$/, "");

function getSeoReadinessReport() {
  const products = productStore.listProducts({ status: "active" });
  const withSeo = products.filter((p) => p.seo?.title && p.seo?.description && p.seo?.slug);
  const withSlug = products.filter((p) => p.seo?.slug);

  return {
    site_url: SITE_URL,
    api_url: API_URL,
    catalog_mode: true,
    infrastructure: {
      sitemap: `${SITE_URL}/sitemap.xml`,
      robots: `${SITE_URL}/robots.txt`,
      google_merchant_feed: `${API_URL}/api/localization/feed/google.xml`,
      product_structured_data: "lib/seo/structured-data.ts (JSON-LD)",
      open_graph: "lib/seo/metadata.ts",
      hreflang: "lib/i18n/routing.ts → hreflangAlternates()",
    },
    search_console: {
      status: "manual_setup_required",
      steps_doc: "docs/SEO_SEARCH_CONSOLE_DE.md",
      verification_options: ["DNS TXT", "HTML file", "meta tag"],
      sitemap_submit_url: `${SITE_URL}/sitemap.xml`,
      note: "Add GOOGLE_SITE_VERIFICATION env when token is available — do not commit token.",
    },
    merchant_center: {
      feed_url: `${API_URL}/api/localization/feed/google.xml?locale=de-DE&country=DE&currency=EUR`,
      schema: "RSS 2.0 + g: namespace (localizationFeeds.js)",
      images: "placeholder_policy — no forced real product images",
    },
    product_coverage: {
      active: products.length,
      with_seo_meta: withSeo.length,
      with_slug: withSlug.length,
      missing_seo: products.filter((p) => !p.seo?.title || !p.seo?.description).map((p) => p.id),
    },
    checklist: [
      { item: "Meta titles/descriptions", done: withSeo.length === products.length },
      { item: "Canonical URLs", done: true },
      { item: "Sitemap.xml", done: true },
      { item: "robots.txt", done: true },
      { item: "Structured data", done: true },
      { item: "Open Graph", done: true },
      { item: "hreflang", done: true },
      { item: "Search Console property", done: Boolean(process.env.GOOGLE_SITE_VERIFICATION) },
      { item: "Merchant feed endpoint", done: true },
    ],
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getSeoReadinessReport, SITE_URL, API_URL };
