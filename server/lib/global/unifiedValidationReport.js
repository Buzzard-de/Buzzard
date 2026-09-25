/**
 * Unified validation report bridge — admin-facing canonical format.
 * Wraps global productValidationReport without replacing PIM-internal staging reports.
 */
const { normalizeCanonicalProduct } = require("./productCanonicalModel");
const { buildProductValidationReport } = require("./productValidationReport");
const { runGlobalProductPipeline } = require("./globalProductPipeline");

function toStageArray(report) {
  const stageKeys = [
    "identity", "taxonomy", "supplierMapping", "validation", "gtin", "mpn",
    "vehicleCompatibility", "images", "languageSeo", "countryAvailability",
    "review", "approval", "publish",
  ];
  return stageKeys.map((key) => ({
    stage: key,
    status: report[key]?.status || "REVIEW_REQUIRED",
    errors: report[key]?.details?.findings || report[key]?.details?.errors || [],
    warnings: report[key]?.details?.warnings || [],
    missingFields: report[key]?.details?.missingFields || [],
    details: report[key]?.details || {},
  }));
}

function buildUnifiedValidationReport(product = {}, context = {}) {
  const canonical = normalizeCanonicalProduct(product);
  const report = buildProductValidationReport(product, context);
  const pipeline = runGlobalProductPipeline(product, context);
  return {
    sku: canonical.identity.sku || product.sku,
    canonical,
    stages: toStageArray(report),
    report,
    pipeline,
    publishAllowed: false,
    safety: report.safety,
  };
}

module.exports = {
  buildUnifiedValidationReport,
  toStageArray,
};
