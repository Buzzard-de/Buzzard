/**
 * Localized SEO helpers — no false pricing/availability in structured data.
 */
const { buildHreflangAlternates } = require("./hreflang");
const { generateLocalizedSlug } = require("./slugGeneration");
const { GLOBAL_SAFETY_POLICY } = require("../../core/globalSafetyPolicy");

function buildLocalizedProductSeo(product = {}, context = {}) {
  const language = context.language || "de";
  const country = context.country || "DE";
  const translation = product.translations?.[language] || {};
  const slug = translation.slug || translation.seo?.slug || generateLocalizedSlug(product.title, { language });

  return {
    title: translation.seo?.metaTitle || translation.title || product.title,
    description: translation.seo?.metaDescription || translation.description || product.description,
    slug,
    canonicalUrl: context.canonicalBase ? `${context.canonicalBase}/${slug}` : `/${slug}`,
    keywords: translation.keywords || translation.seo?.keywords || [],
    hreflang: buildHreflangAlternates(context.path || "/", context.availablePairs || []),
    publishBlocked: GLOBAL_SAFETY_POLICY.publishBlocked,
    includeOffers: false,
    includePrice: false,
    country,
    language,
  };
}

function buildProductStructuredData(product = {}, seo = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seo.title,
    description: seo.description,
    sku: product.sku,
    gtin: product.gtin || product.ean || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    mpn: product.mpn || undefined,
    url: seo.canonicalUrl,
  };
}

module.exports = {
  buildLocalizedProductSeo,
  buildProductStructuredData,
};
