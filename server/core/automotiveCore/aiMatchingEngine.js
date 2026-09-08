/**
 * Automotive Core — unified AI matching (recommendations only, never publish).
 */
const categoryEngine = require("./categoryEngine");
const identityEngine = require("./identityEngine");
const fitmentEngine = require("./fitmentEngine");
const supplierEngine = require("./supplierEngine");

const ACTIONS = Object.freeze(["AUTO_ACCEPT", "REVIEW_REQUIRED", "REJECT"]);

function matchProduct(input = {}) {
  const { supplierProduct = {}, buzzardProduct = {}, vehicle = {}, categoryHint = null } = input;

  const categoryMatch = categoryHint
    ? categoryEngine.validateCategoryPath(categoryHint, supplierProduct.subCategoryId)
    : supplierEngine.resolveSupplierCategoryMapping(
        supplierProduct.supplierId || "unknown",
        supplierProduct.category || supplierProduct.sourceCategory
      );

  const identity = identityEngine.validateIdentity(supplierProduct, { requireGtin: false });
  const duplicateRisk = identityEngine.detectDuplicateProduct(supplierProduct, input.existingProducts || []);
  const vehicleMatch = vehicle && Object.keys(vehicle).length
    ? fitmentEngine.explainFitmentMatch(buzzardProduct, vehicle)
    : { level: "UNKNOWN", requiresReview: true };

  const confidence = Math.min(
    1,
    (categoryMatch.mapped || categoryMatch.status === "PASS" ? 0.3 : 0.1) +
      (identity.ok ? 0.3 : 0) +
      (duplicateRisk.duplicate ? 0 : 0.2) +
      (vehicleMatch.level === "EXACT" ? 0.2 : vehicleMatch.level === "HIGH" ? 0.15 : 0)
  );

  let recommendedAction = "REVIEW_REQUIRED";
  if (confidence >= 0.9 && !duplicateRisk.duplicate && identity.ok) recommendedAction = "AUTO_ACCEPT";
  if (!identity.ok || duplicateRisk.duplicate) recommendedAction = "REJECT";

  return {
    categoryMatch,
    productMatch: { confidence, matched: confidence >= 0.7 },
    vehicleMatch,
    duplicateRisk,
    confidence,
    reasons: [
      categoryMatch.reason || categoryMatch.status,
      identity.ok ? "identity_ok" : "identity_issues",
      duplicateRisk.duplicate ? "duplicate_risk" : "no_duplicate",
    ].filter(Boolean),
    evidence: {
      category: categoryMatch,
      identity: identity.fingerprint,
      fitment: vehicleMatch.evidence || [],
    },
    recommendedAction,
    note: "AI recommendation is NOT human approval",
    publishAllowed: false,
    activateSupplierAllowed: false,
    createOrderAllowed: false,
  };
}

module.exports = {
  ACTIONS,
  matchProduct,
};
