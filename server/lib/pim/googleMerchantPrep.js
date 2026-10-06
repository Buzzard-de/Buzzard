/**
 * Google Merchant feed preparation — structure only, no publishing.
 * Products without required commercial data are excluded.
 */
const { isDemoOrTestProduct } = require("./demoProductGuard");
const { buildStructuredValidationResult } = require("./productValidationReport");
const { STOREFRONT_VISIBILITY } = require("../../core/storefrontConstants");
const { PRODUCT_STATUS } = require("../../core/productConstants");

function isMerchantEligible(product, { salesEnabled = false } = {}) {
  if (!product) return { eligible: false, reason: "missing_product" };
  if (isDemoOrTestProduct(product)) return { eligible: false, reason: "demo_product" };
  if (!salesEnabled) return { eligible: false, reason: "sales_disabled" };
  if (product.visibility !== STOREFRONT_VISIBILITY.PUBLIC) {
    return { eligible: false, reason: "not_public" };
  }
  if (![PRODUCT_STATUS.READY, PRODUCT_STATUS.ACTIVE].includes(product.status)) {
    return { eligible: false, reason: "status_not_ready" };
  }

  const validation = buildStructuredValidationResult(product, { pipeline: false });
  if (!validation.valid) return { eligible: false, reason: "validation_failed", validation };

  const hasGtin = Boolean(product.gtin || product.ean);
  const hasTitle = String(product.title || "").trim().length >= 3;
  const hasImage = Array.isArray(product.images) && product.images.length > 0;
  const hasPrice = Number(product.price) > 0;

  if (!hasGtin || !hasTitle || !hasImage || !hasPrice) {
    return {
      eligible: false,
      reason: "missing_merchant_fields",
      missing: [
        !hasGtin && "gtin",
        !hasTitle && "title",
        !hasImage && "image",
        !hasPrice && "price",
      ].filter(Boolean),
    };
  }

  return { eligible: true };
}

function toMerchantProduct(product, options = {}) {
  const check = isMerchantEligible(product, options);
  if (!check.eligible) {
    return { excluded: true, reason: check.reason, details: check };
  }

  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const imageUrl = typeof primaryImage === "string" ? primaryImage : primaryImage?.url;

  return {
    excluded: false,
    offerId: product.sku,
    id: product.gtin || product.ean,
    title: product.title,
    description: product.description || product.shortDescription || product.title,
    link: options.productUrl ? `${options.productUrl.replace(/\/$/, "")}/products/${product.sku}/` : null,
    imageLink: imageUrl,
    brand: product.brand?.name || product.manufacturer || product.brand,
    condition: "new",
    availability: product.stock > 0 ? "in_stock" : "out_of_stock",
    price: {
      value: Number(product.price).toFixed(2),
      currency: product.currency || "EUR",
    },
    googleProductCategory: product.category || product.taxonomy_category_id || null,
    customAttributes: {
      mpn: product.mpn || null,
      supplierSku: product.supplierSku || null,
    },
    publishBlocked: true,
    note: "Prepared for future Merchant activation — not published",
  };
}

module.exports = {
  isMerchantEligible,
  toMerchantProduct,
};
