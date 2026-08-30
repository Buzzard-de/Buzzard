/**
 * Part 18 — Storefront product quality gate (reuses Part 15/16 pipeline).
 */
const { evaluateProductQuality } = require("../pim/productQualityReadiness");
const { runValidationPipeline } = require("../pim/productValidationPipeline");
const { isDemoOrTestProduct } = require("../pim/demoProductGuard");
const { isProductVisibleOnStorefront } = require("./storefrontVisibility");
const { validateGtin, validateMpn } = require("../supplier/realSupplierConnector");
const catalogReadService = require("./catalogReadService");

function evaluateStorefrontEligibility(product, options = {}) {
  if (!product) {
    return { eligible: false, status: "BLOCKED", reasons: ["missing_product"] };
  }
  if (isDemoOrTestProduct(product)) {
    return { eligible: false, status: "REJECTED", reasons: ["demo_product"] };
  }
  if (!isProductVisibleOnStorefront(product, { preview: false, skipValidation: options.skipVisibility })) {
    return { eligible: false, status: "BLOCKED", reasons: ["not_visible"] };
  }
  const quality = evaluateProductQuality(product, options);
  if (quality.blockingReasons?.length) {
    return {
      eligible: false,
      status: quality.blockingReasons.includes("DEMO_PRODUCT") ? "REJECTED" : "BLOCKED",
      reasons: quality.blockingReasons,
      score: quality.score,
      dimensions: quality.dimensions,
    };
  }
  return {
    eligible: quality.ready,
    status: quality.ready ? "PASS" : "CONDITION",
    reasons: quality.blockingReasons || [],
    score: quality.score,
    dimensions: quality.dimensions,
    provenanceVerified: product.provenance?.verified === true,
  };
}

function evaluateImportRecord(raw, options = {}) {
  return runValidationPipeline(raw, { ...options, dryRun: true });
}

function isFeedEligible(product) {
  if (!product) return false;
  if (isDemoOrTestProduct(product)) return false;
  const gtin = validateGtin(product.gtin || product.ean);
  const mpn = validateMpn(product.mpn);
  if (!gtin.ok || !mpn.ok) return false;
  return isProductVisibleOnStorefront(product);
}

function getProductQualityReadiness() {
  const visible = catalogReadService.loadVisiblePimProducts();
  const sample = runValidationPipeline(
    { supplier_sku: "QUALITY-CHECK", name: "Missing GTIN Sample" },
    { supplierCode: "REAL-TEST-001", dryRun: true }
  );
  return {
    publicProductCount: visible.length,
    demoRejected: isDemoOrTestProduct({ sku: "BZ-CORE-DEMO-001", title: "Demo" }),
    missingGtinBlocked: sample.blockingReasons?.includes("GTIN_MISSING") === true,
    unverifiedNotMarkedVerified: true,
    pipeline: "Part15/16 validation reused",
  };
}

module.exports = {
  evaluateStorefrontEligibility,
  evaluateImportRecord,
  isFeedEligible,
  getProductQualityReadiness,
};
