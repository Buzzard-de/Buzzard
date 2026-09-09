/**
 * Automotive Core — supplier ingestion pipeline (staging only).
 */
const productEngine = require("./productEngine");
const identityEngine = require("./identityEngine");
const categoryEngine = require("./categoryEngine");
const supplierEngine = require("./supplierEngine");
const fitmentEngine = require("./fitmentEngine");
const aiMatchingEngine = require("./aiMatchingEngine");
const { runAutomotiveProductPipeline } = require("../../lib/catalog/automotiveProductPipeline");

const STAGES = Object.freeze([
  "RECEIVED", "NORMALIZED", "MAPPED", "VALIDATED", "REVIEW_REQUIRED",
  "APPROVED", "PUBLISHED", "REJECTED",
]);

function runIngestionPipeline(rawProduct = {}, context = {}) {
  const results = [];
  let state = "RECEIVED";
  let blocked = false;

  const normalized = productEngine.normalizeAutomotiveProduct(rawProduct);
  state = "NORMALIZED";
  results.push({ stage: "normalize", status: "PASS", product: normalized.sku });

  const mapping = supplierEngine.resolveSupplierCategoryMapping(
    rawProduct.supplierId || "unknown",
    rawProduct.sourceCategory || rawProduct.category
  );
  state = mapping.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "MAPPED";
  results.push({ stage: "category_mapping", ...mapping });

  const identity = identityEngine.validateIdentity(normalized);
  if (!identity.ok) {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }
  results.push({ stage: "identity", status: identity.ok ? "PASS" : "FAIL", identity });

  const fitment = normalized.fitment?.length
    ? fitmentEngine.validateFitment(normalized.fitment[0])
    : { status: "REVIEW_REQUIRED", valid: false };
  results.push({ stage: "fitment", ...fitment });

  const aiMatch = aiMatchingEngine.matchProduct({
    supplierProduct: rawProduct,
    buzzardProduct: normalized,
    vehicle: context.vehicle,
    categoryHint: mapping.targetCategory || normalized.categoryId,
    existingProducts: context.existingProducts || [],
  });
  results.push({ stage: "ai_matching", status: aiMatch.recommendedAction, ...aiMatch });

  const legacyPipeline = runAutomotiveProductPipeline({ ...rawProduct, ...normalized }, context);
  results.push({ stage: "legacy_pipeline", status: legacyPipeline.status || "PASS", stages: legacyPipeline.stages?.length });

  const catPath = categoryEngine.validateCategoryPath(
    normalized.categoryId,
    normalized.subCategoryId,
    normalized.subSubCategoryId,
    normalized.productType
  );
  if (!catPath.valid) {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }
  results.push({ stage: "category_path", ...catPath });

  if (blocked || state === "REVIEW_REQUIRED") state = "REVIEW_REQUIRED";
  if (rawProduct.status === "APPROVED") state = "APPROVED";
  if (rawProduct.status === "PUBLISHED") state = "REVIEW_REQUIRED";

  return {
    state,
    blocked,
    publishAllowed: false,
    results,
    pipeline: legacyPipeline,
    safety: { liveImport: false, publishBlocked: true },
  };
}

module.exports = {
  STAGES,
  runIngestionPipeline,
};
