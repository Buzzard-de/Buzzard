/**
 * Part 7 — Product visibility rules for public storefront
 */
const { PRODUCT_STATUS, SALES_BLOCKED_STATUSES } = require("../../core/productConstants");
const { STOREFRONT_PRODUCT_STATUS, STOREFRONT_VISIBILITY } = require("../../core/storefrontConstants");
const categoryVisibility = require("../categoryVisibility");
const productValidation = require("../pim/productValidation");

function isDemoStorefrontProduct(product) {
  const sku = String(product.sku || "").toUpperCase();
  const id = String(product.id || "").toLowerCase();
  const title = String(product.title || "").toLowerCase();
  const brand = String(product.brand?.name || product.brand || "").toLowerCase();
  if (sku.includes("DEMO") || id.includes("demo")) return true;
  if (/\bdemo\b/.test(title) || /\btestprodukt\b/.test(title)) return true;
  if (brand.includes("demo")) return true;
  return false;
}

function isCategoryVisibleForStorefront(categoryId) {
  if (!categoryId) return false;
  const entry = categoryVisibility.getCategoryStatus(categoryId);
  return categoryVisibility.isVisibleToCustomer(entry.status);
}

function isProductVisibleOnStorefront(product, { preview = false, skipValidation = false } = {}) {
  if (!product) return false;
  if (preview) return true;

  if (SALES_BLOCKED_STATUSES.has(product.status)) return false;
  if (!STOREFRONT_PRODUCT_STATUS.includes(product.status)) return false;

  const vis = product.visibility || STOREFRONT_VISIBILITY.HIDDEN;
  if (vis === STOREFRONT_VISIBILITY.HIDDEN || vis === STOREFRONT_VISIBILITY.PRIVATE) return false;
  if (vis !== STOREFRONT_VISIBILITY.PUBLIC && vis !== STOREFRONT_VISIBILITY.CATALOG) return false;

  const categoryId = product.category || product.taxonomy_category_id;
  if (categoryId && !isCategoryVisibleForStorefront(categoryId)) return false;

  if (!product.title || String(product.title).trim().length < 3) return false;
  if (isDemoStorefrontProduct(product)) return false;

  if (!skipValidation) {
    const validation = productValidation.validateProduct(product);
    if (validation.overall === "FAIL") return false;
  }

  return true;
}

module.exports = {
  isCategoryVisibleForStorefront,
  isProductVisibleOnStorefront,
};
