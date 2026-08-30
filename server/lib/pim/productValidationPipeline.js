/**
 * Part 16 — Supplier-neutral product validation pipeline.
 * Orchestrates normalization, validation, duplicate detection, and quality scoring.
 */
const { STAGING_LIFECYCLE, BLOCKING_CODES } = require("../../core/productLifecycleConstants");
const { normalizeSupplierProductRecord } = require("./supplierProductNormalizer");
const { buildProvenance } = require("./productProvenance");
const { detectDuplicates } = require("./productDuplicateDetector");
const { evaluateProductQuality } = require("./productQualityReadiness");
const { validateFitmentRecord } = require("./fitmentSchema");
const { isDemoOrTestProduct } = require("./demoProductGuard");
const { isTestOnlySupplier } = require("../supplier/supplierProductionGuard");

function deriveLifecycleStatus(quality, { duplicateBlocked = false } = {}) {
  if (duplicateBlocked) return STAGING_LIFECYCLE.BLOCKED;
  if (quality.blockingReasons.includes(BLOCKING_CODES.DEMO_PRODUCT)) return STAGING_LIFECYCLE.REJECTED;
  if (quality.blockingReasons.length > 0) return STAGING_LIFECYCLE.BLOCKED;
  if (quality.ready) return STAGING_LIFECYCLE.VALIDATED;
  if (quality.score >= 50) return STAGING_LIFECYCLE.VALIDATION_PENDING;
  return STAGING_LIFECYCLE.INVALID;
}

function runValidationPipeline(raw, options = {}) {
  const supplierCode = options.supplierCode || raw.supplier_code || raw.supplierCode || null;

  if (!supplierCode) {
    return {
      ok: false,
      blocked: true,
      lifecycleStatus: STAGING_LIFECYCLE.BLOCKED,
      blockingReasons: [BLOCKING_CODES.SUPPLIER_MISSING],
      stages: [{ stage: "supplier_identity", status: "FAIL" }],
    };
  }

  if (isTestOnlySupplier({ supplierId: supplierCode, apiUrl: options.sourceUrl })) {
    return {
      ok: false,
      blocked: true,
      lifecycleStatus: STAGING_LIFECYCLE.REJECTED,
      blockingReasons: [BLOCKING_CODES.SUPPLIER_TEST_ONLY],
      stages: [{ stage: "supplier_identity", status: "FAIL", reason: "TEST_ONLY" }],
    };
  }

  const normalized = normalizeSupplierProductRecord(raw, {
    supplierCode,
    sourceProductId: options.sourceProductId,
    importJobId: options.importJobId,
  });

  if (isDemoOrTestProduct(normalized)) {
    return {
      ok: false,
      blocked: true,
      lifecycleStatus: STAGING_LIFECYCLE.REJECTED,
      blockingReasons: [BLOCKING_CODES.DEMO_PRODUCT],
      normalized,
      stages: [{ stage: "demo_guard", status: "FAIL" }],
    };
  }

  const provenance = buildProvenance({
    sourceSupplierCode: supplierCode,
    sourceProductId: normalized.sourceProductId,
    sourceFeedFormat: options.feedFormat || null,
    sourceUrl: options.sourceUrl || null,
    importJobId: options.importJobId,
    actorId: options.actorId,
    verified: false,
  });

  const duplicateCheck = detectDuplicates(normalized, {
    excludeStagingId: options.excludeStagingId,
    excludeProductId: options.excludeProductId,
  });

  const quality = evaluateProductQuality(
    { ...normalized, provenance, supplierCode },
    {
      requireMpn: options.requireMpn !== false,
      requireImage: options.requireImage !== false,
      requireGtin: options.requireGtin !== false,
      requirePrice: options.requirePrice === true,
      automotive: options.automotive !== false,
      requireFitment: false,
    }
  );

  const fitment = validateFitmentRecord(normalized, { requireFitment: false });

  const blockingReasons = [...quality.blockingReasons];
  if (!duplicateCheck.ok) {
    for (const dup of duplicateCheck.issues) blockingReasons.push(dup.code);
  }

  const lifecycleStatus = deriveLifecycleStatus(quality, { duplicateBlocked: !duplicateCheck.ok });
  const blocked = lifecycleStatus === STAGING_LIFECYCLE.BLOCKED || lifecycleStatus === STAGING_LIFECYCLE.INVALID;

  return {
    ok: !blocked && lifecycleStatus !== STAGING_LIFECYCLE.REJECTED,
    blocked,
    lifecycleStatus,
    blockingReasons: [...new Set(blockingReasons)],
    normalized,
    provenance,
    quality,
    fitment,
    duplicates: duplicateCheck,
    stages: [
      { stage: "normalization", status: "PASS" },
      { stage: "provenance", status: provenance.sourceSupplierCode ? "PASS" : "FAIL" },
      { stage: "duplicate_detection", status: duplicateCheck.ok ? "PASS" : "FAIL", issues: duplicateCheck.issues },
      { stage: "validation", status: quality.ready ? "PASS" : quality.blockingReasons.length ? "FAIL" : "WARNING" },
      { stage: "quality_score", status: "PASS", score: quality.score },
    ],
  };
}

module.exports = {
  runValidationPipeline,
  deriveLifecycleStatus,
};
