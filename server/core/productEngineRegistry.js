/**
 * Server-side Product Engine mirror — validates critical fields server-side.
 */
const { isProductAvailableInCountry } = require("../lib/global/countryAvailability");
const { normalizeSupplierProductRecord } = require("../lib/pim/supplierProductNormalizer");
const { extractProductIdentity, compareIdentity } = require("../lib/global/productIdentity");
const { getVatContext } = require("./marketEngineRegistry");

const productStore = new Map();

function validateServerProduct(product = {}) {
  const errors = [];
  if (!product.sku?.trim()) errors.push("SKU_MISSING");
  if (!product.brand?.trim()) errors.push("BRAND_MISSING");
  if (!product.categoryId?.trim()) errors.push("CATEGORY_MISSING");
  if (!Array.isArray(product.supplierOffers) || product.supplierOffers.length === 0) {
    errors.push("SUPPLIER_MISSING");
  }
  return { valid: errors.length === 0, errors };
}

function sanitizeClientPatch(existing, patch) {
  return {
    translations: patch.translations ?? existing.translations,
    images: patch.images ?? existing.images,
    compatibility: patch.compatibility ?? existing.compatibility,
    technicalData: patch.technicalData ?? existing.technicalData,
    categoryId: patch.categoryId ?? existing.categoryId,
    productId: existing.productId,
    sku: existing.sku,
    pricing: existing.pricing,
    stock: existing.stock,
    supplierOffers: existing.supplierOffers,
    status: existing.status,
  };
}

function normalizeSupplierProduct(input) {
  return normalizeSupplierProductRecord(input.raw || input, {
    supplierCode: input.supplierId,
    sourceProductId: input.sourceProductId,
  });
}

function compareProducts(a, b) {
  return compareIdentity(
    { id: a.productId, sku: a.sku, ean: a.ean, gtin: a.gtin, mpn: a.mpn, brand: a.brand },
    { id: b.productId, sku: b.sku, ean: b.ean, gtin: b.gtin, mpn: b.mpn, brand: b.brand }
  );
}

function isProductAvailableInMarket(product, countryCode) {
  if (product.status === "DISCONTINUED" || product.status === "ARCHIVED") {
    return { available: false, status: "BLOCKED", reason: "PRODUCT_DISCONTINUED" };
  }
  const entry = (product.availability || []).find((a) => a.countryCode === String(countryCode).toUpperCase());
  if (entry?.status === "DISABLED") {
    return { available: false, status: "BLOCKED", reason: "MARKET_DISABLED" };
  }
  return isProductAvailableInCountry(
    {
      countryAvailability: product.countryAvailability || {},
      stockStatus: product.stock?.availability === "OUT_OF_STOCK" ? "out_of_stock" : "in_stock",
    },
    countryCode
  );
}

function createProductSnapshot(product, options = {}) {
  const offer = product.supplierOffers?.[0] || {};
  return {
    snapshotId: `snap_${product.productId}_${Date.now()}`,
    productId: product.productId,
    sku: product.sku,
    ean: product.ean || product.gtin,
    name: product.name || product.productId,
    supplierId: offer.supplierId,
    supplierSku: offer.supplierSku,
    purchasePrice: offer.supplierPrice ?? product.pricing?.supplierCost ?? 0,
    customerPrice: product.pricing?.customerPrice ?? 0,
    currency: product.pricing?.currency || offer.currency || "EUR",
    taxContext: getVatContext({
      sellerCountry: options.sellerCountry || "DE",
      buyerCountry: options.countryCode || "DE",
      customerType: options.customerType || "B2C",
    }),
    capturedAt: new Date().toISOString(),
  };
}

function registerProduct(product) {
  const validation = validateServerProduct(product);
  productStore.set(product.productId, { ...product, _serverValidated: validation.valid });
  return { product, validation };
}

function getProduct(productId) {
  return productStore.get(productId) || null;
}

module.exports = {
  validateServerProduct,
  sanitizeClientPatch,
  normalizeSupplierProduct,
  extractProductIdentity,
  compareProducts,
  isProductAvailableInMarket,
  createProductSnapshot,
  registerProduct,
  getProduct,
};
