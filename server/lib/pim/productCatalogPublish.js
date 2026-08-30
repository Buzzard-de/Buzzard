/**
 * Part 15 — Explicit catalog publish (visibility only — NOT sales activation).
 */
const productCore = require("./productCore");
const productValidation = require("./productValidation");
const categoryEngine = require("./categoryEngine");
const { isDemoOrTestProduct } = require("./demoProductGuard");
const { assertProductionSafety } = require("./productionSafetyGate");
const { isProductVisibleOnStorefront } = require("../storefront/storefrontVisibility");
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

function publishProduct(sku, { actorId = "pim-publish", visibility = STOREFRONT_VISIBILITY.CATALOG } = {}) {
  assertProductionSafety();

  const product = productCore.getProduct(sku);
  const check = canPublishProduct(product);
  if (!check.ok) {
    return { success: false, sku, ...check };
  }

  if (check.status === PUBLISH_STATUS.ALREADY_PUBLISHED) {
    return { success: true, sku, status: PUBLISH_STATUS.ALREADY_PUBLISHED, product };
  }

  let current = product;

  if (current.status === PRODUCT_STATUS.IMPORTED) {
    current = productCore.transitionStatus(current.id, PRODUCT_STATUS.VALIDATING, {
      source: "ADMIN",
      actorId,
    });
  }
  if (current.status === PRODUCT_STATUS.VALIDATING) {
    current = productCore.transitionStatus(current.id, PRODUCT_STATUS.READY, {
      source: "ADMIN",
      actorId,
    });
  } else if (current.status !== PRODUCT_STATUS.READY && current.status !== PRODUCT_STATUS.ACTIVE) {
    return {
      success: false,
      sku,
      status: PUBLISH_STATUS.STATUS_BLOCKED,
      reason: `Cannot publish from status ${current.status}`,
    };
  }

  current = productCore.updateProduct(
    current.id,
    { visibility },
    { source: "ADMIN", actorId }
  );

  const visible = isProductVisibleOnStorefront(current);
  return {
    success: visible,
    sku,
    status: visible ? PUBLISH_STATUS.PUBLISHED : PUBLISH_STATUS.VALIDATION_FAILED,
    product: current,
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
    catalogOnly: true,
  };
}

function publishDryRun(sku) {
  const product = productCore.getProduct(sku);
  const check = canPublishProduct(product);
  return {
    dryRun: true,
    sku,
    wouldPublish: check.ok && check.status !== PUBLISH_STATUS.ALREADY_PUBLISHED,
    ...check,
    salesWouldChange: false,
    paymentsWouldChange: false,
  };
}

module.exports = {
  PUBLISH_STATUS,
  canPublishProduct,
  publishProduct,
  publishDryRun,
};
