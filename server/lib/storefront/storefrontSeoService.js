/**
 * Part 18 — SEO readiness for storefront (no fake products in sitemap).
 */
const categoryEngine = require("../pim/categoryEngine");
const categoryCatalog = require("./categoryCatalog");
const catalogReadService = require("./catalogReadService");
const { mapPimToStorefront } = require("./publicProductMapper");
const productCore = require("../pim/productCore");
const { isProductVisibleOnStorefront } = require("./storefrontVisibility");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.BUZZARD_SITE_URL || "https://buzzard24.de").replace(
  /\/$/,
  ""
);

function buildProductSeo(product) {
  const mapped = mapPimToStorefront(product);
  if (!mapped) return null;
  const slug = mapped.seo?.slug || mapped.sku;
  return {
    canonical: `${SITE_URL}/produkt/${slug}/`,
    title: mapped.seo?.metaTitle || mapped.title,
    metaDescription: mapped.seo?.metaDescription || mapped.shortDescription || "",
    slug,
    robots: process.env.BUZZARD_SALES_ENABLED === "1" ? "index,follow" : "index,follow",
    structuredData: mapped.structuredData,
    hreflangBase: `/produkt/${slug}/`,
  };
}

function buildCategorySeo(categoryId) {
  const cat = categoryCatalog.getCategoryById(categoryId);
  if (!cat) return null;
  return {
    canonical: `${SITE_URL}${cat.url || `/kategorie/${cat.slug}/`}`,
    title: cat.name,
    metaDescription: `${cat.name} — Buzzard Katalog`,
    slug: cat.slug,
    robots: "index,follow",
  };
}

function buildSitemapEntries() {
  const entries = [];
  const staticPages = ["/", "/products/", "/impressum/", "/datenschutz/", "/agb/"];
  for (const path of staticPages) {
    entries.push({ loc: `${SITE_URL}${path.replace(/^\//, "")}`, type: "static", changefreq: "weekly" });
  }

  const categories = categoryCatalog.listMainCategories();
  for (const cat of categories) {
    entries.push({
      loc: `${SITE_URL}${(cat.url || `/kategorie/${cat.slug}/`).replace(/^\//, "")}`,
      type: "category",
      changefreq: "weekly",
    });
    const children = categoryCatalog.getCategoryChildren(cat.id);
    for (const child of children) {
      entries.push({
        loc: `${SITE_URL}${(child.url || `/kategorie/${child.slug}/`).replace(/^\//, "")}`,
        type: "subcategory",
        changefreq: "weekly",
      });
    }
  }

  const visible = productCore.listProducts({ limit: 1000 }).filter((p) => isProductVisibleOnStorefront(p));
  for (const p of visible) {
    const seo = buildProductSeo(p);
    if (seo) {
      entries.push({ loc: seo.canonical, type: "product", changefreq: "daily", lastmod: p.updatedAt });
    }
  }

  return entries;
}

function getSeoReadiness() {
  const health = catalogReadService.getHealth();
  const sitemapEntries = buildSitemapEntries();
  const productEntries = sitemapEntries.filter((e) => e.type === "product");
  return {
    siteUrl: SITE_URL,
    architecture: {
      sitemap: `${SITE_URL}/sitemap.xml`,
      robots: `${SITE_URL}/robots.txt`,
      canonicalHandling: true,
      structuredData: "JSON-LD via publicProductMapper",
      hreflang: "lib/i18n/routing.ts",
    },
    publicProductCount: health.productCount,
    sitemapProductCount: productEntries.length,
    fakeProductsInSitemap: false,
    zeroProductsOk: health.productCount === 0,
  };
}

module.exports = {
  SITE_URL,
  buildProductSeo,
  buildCategorySeo,
  buildSitemapEntries,
  getSeoReadiness,
};
