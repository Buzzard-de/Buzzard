/**
 * Part 18 — Google Merchant Center feed from validated public PIM catalog only.
 * No demo/test products. No unverified GTIN/MPN. Empty feed when 0 public products.
 */
const catalogReadService = require("./catalogReadService");
const { mapPimToStorefront } = require("./publicProductMapper");
const { isFeedEligible } = require("./storefrontProductQuality");
const { validateGtin, validateMpn } = require("../supplier/realSupplierConnector");
const categoryEngine = require("../pim/categoryEngine");
const productCore = require("../pim/productCore");
const { isProductVisibleOnStorefront } = require("./storefrontVisibility");

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mapAvailability(stockStatus) {
  const s = String(stockStatus || "").toLowerCase();
  if (s === "in_stock" || s === "low_stock") return "in_stock";
  return "out_of_stock";
}

function resolveGoogleCategory(categoryId) {
  if (!categoryId) return null;
  const cat = categoryEngine.findTaxonomyCategory(categoryId);
  return cat?.google_product_category || cat?.googleProductCategory || null;
}

function buildEligibleFeedItems(filters = {}) {
  const locale = filters.locale || "de-DE";
  const currency = filters.currency || "EUR";
  const country = (filters.country || "DE").toUpperCase();
  const base = (process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://buzzard24.de").replace(
    /\/$/,
    ""
  );
  const salesEnabled = process.env.BUZZARD_SALES_ENABLED === "1";

  const pimRows = productCore.listProducts({ limit: 1000 }).filter((p) => isProductVisibleOnStorefront(p));
  const eligible = [];

  for (const row of pimRows) {
    if (!isFeedEligible(row)) continue;
    const mapped = mapPimToStorefront(row);
    if (!mapped) continue;

    const gtinResult = validateGtin(mapped.gtin || mapped.ean);
    const mpnResult = validateMpn(mapped.mpn);
    if (!gtinResult.ok || !mpnResult.ok) continue;

    eligible.push({
      id: mapped.sku,
      title: mapped.title,
      description: mapped.description || mapped.shortDescription || mapped.title,
      link: `${base}/produkt/${mapped.seo?.slug || mapped.sku}/?lang=${locale}`,
      image_link: mapped.images?.[0] || mapped.media?.find((m) => m.type === "image")?.url || "",
      availability: mapAvailability(mapped.stockStatus),
      price: salesEnabled ? `${Number(mapped.price).toFixed(2)} ${currency}` : null,
      brand: mapped.brand?.name || "",
      gtin: gtinResult.normalized || mapped.gtin || mapped.ean,
      mpn: mapped.mpn,
      condition: "new",
      google_product_category: resolveGoogleCategory(mapped.categoryId),
      country,
    });
  }

  return { items: eligible, locale, currency, country, salesEnabled };
}

function buildGoogleMerchantFeedXml(filters = {}) {
  const { items, locale, currency, country, salesEnabled } = buildEligibleFeedItems(filters);

  const xmlItems = items
    .map((item) => {
      const parts = [
        `<g:id>${escapeXml(item.id)}</g:id>`,
        `<g:title>${escapeXml(item.title)}</g:title>`,
        `<g:description>${escapeXml(item.description)}</g:description>`,
        `<g:link>${escapeXml(item.link)}</g:link>`,
        `<g:availability>${item.availability}</g:availability>`,
        `<g:condition>${item.condition}</g:condition>`,
      ];
      if (item.image_link) parts.push(`<g:image_link>${escapeXml(item.image_link)}</g:image_link>`);
      if (item.brand) parts.push(`<g:brand>${escapeXml(item.brand)}</g:brand>`);
      if (item.gtin) parts.push(`<g:gtin>${escapeXml(item.gtin)}</g:gtin>`);
      if (item.mpn) parts.push(`<g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
      if (item.google_product_category) {
        parts.push(`<g:google_product_category>${escapeXml(item.google_product_category)}</g:google_product_category>`);
      }
      if (salesEnabled && item.price) parts.push(`<g:price>${escapeXml(item.price)}</g:price>`);
      parts.push(`<g:shipping><g:country>${country}</g:country></g:shipping>`);
      return `<item>${parts.join("")}</item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Buzzard Merchant Feed</title><description>Validated public catalog only</description>${xmlItems}</channel></rss>`;
}

function getMerchantFeedReadiness() {
  const { items, salesEnabled } = buildEligibleFeedItems({});
  return {
    source: "pim_public_catalog",
    eligibleItemCount: items.length,
    demoExcluded: true,
    unverifiedGtinExcluded: true,
    unverifiedMpnExcluded: true,
    fakeDataGenerated: false,
    salesEnabled,
    priceInFeed: salesEnabled,
    emptyFeedWhenZeroProducts: true,
  };
}

module.exports = {
  buildEligibleFeedItems,
  buildGoogleMerchantFeedXml,
  getMerchantFeedReadiness,
};
