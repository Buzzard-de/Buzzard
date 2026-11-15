/**
 * Part 15 — Explicit catalog publish (visibility only — NOT sales activation).
 */
const productValidation = require("./productValidation");
const { isDemoOrTestProduct } = require("./demoProductGuard");
const categoryVisibility = require("../categoryVisibility");
const { PRODUCT_STATUS, VALIDATION_STATUS } = require("../../core/productConstants");
const { STOREFRONT_VISIBILITY } = require("../../core/storefrontConstants");

const PUBLISH_STATUS = Object.freeze({
  PUBLISHED: "PUBLISHED",
  SKIPPED_DEMO: "SKIPPED_DEMO",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  CATEGORY_BLOCKED: "CATEGORY_BLOCKED",
  ALREADY_PUBLISHED: "ALREADY_PUBLISHED",
  STATUS_BLOCKED: "STATUS_BLOCKED",
});

function canPublishProduct(product) {
  if (!product) {
    return { ok: false, status: PUBLISH_STATUS.NOT_FOUND, reason: "Product not found" };
  }

  if (isDemoOrTestProduct(product)) {
    return { ok: false, status: PUBLISH_STATUS.SKIPPED_DEMO, reason: "Demo/test product" };
  }

  const validation = productValidation.validateProduct(product);
  if (validation.overall !== VALIDATION_STATUS.PASS) {
    return {
      ok: false,
      status: PUBLISH_STATUS.VALIDATION_FAILED,
      reason: "Validation must be PASS",
      validation,
    };
  }

  const categoryId = product.category || product.taxonomy_category_id;
  if (categoryId) {
    const catStatus = categoryVisibility.getCategoryStatus(categoryId);
    if (!categoryVisibility.isVisibleToCustomer(catStatus.status)) {
      return {
        ok: false,
        status: PUBLISH_STATUS.CATEGORY_BLOCKED,
        reason: `Category not visible: ${categoryId}`,
      };
    }
  }

  if (!product.brandId && !product.brand) {
    return { ok: false, status: PUBLISH_STATUS.VALIDATION_FAILED, reason: "Brand required for publish" };
  }

  if (product.visibility === STOREFRONT_VISIBILITY.CATALOG || product.visibility === STOREFRONT_VISIBILITY.PUBLIC) {
    if (product.status === PRODUCT_STATUS.READY || product.status === PRODUCT_STATUS.ACTIVE) {
      return { ok: true, status: PUBLISH_STATUS.ALREADY_PUBLISHED, reason: "Already catalog-visible" };
    }
  }

  return { ok: true, status: null, validation };
}

function closedPublish(sku, dryRun) {
  if (isDemoOrTestProduct({ sku })) {
    return {
      success: false,
      ok: false,
      dryRun,
      sku,
      status: PUBLISH_STATUS.SKIPPED_DEMO,
      reason: "Demo/test product",
      wouldPublish: false,
      published: false,
      sellable: false,
      live: false,
      productionReady: false,
      salesWouldChange: false,
      paymentsWouldChange: false,
    };
  }
  return {
    success: false,
    ok: false,
    dryRun,
    sku,
    status: "SALES_CLOSED",
    code: "SALES_CLOSED",
    reason: "Catalog publish is closed",
    wouldPublish: false,
    published: false,
    sellable: false,
    live: false,
    productionReady: false,
    salesWouldChange: false,
    paymentsWouldChange: false,
  };
}

function publishProduct(sku) {
  return closedPublish(sku, false);
}

function publishDryRun(sku) {
  return closedPublish(sku, true);
}

module.exports = {
  PUBLISH_STATUS,
  canPublishProduct,
  publishProduct,
  publishDryRun,
};
