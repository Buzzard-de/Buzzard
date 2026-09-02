/**
 * Part 22 — Supplier-independent product quality hardening orchestrator.
 * Composes Part 16 modules + Part 22 validators. Diagnostic only.
 */
const { QUALITY_STATUS, HARDENING_DIMENSIONS, buildBlockReason } = require("../../core/productQualityHardeningConstants");
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");
const { evaluateProductQuality } = require("./productQualityReadiness");
const { validateProductIdentity } = require("./productIdentityValidator");
const { evaluateAttributeQuality } = require("./productAttributeQuality");
const { evaluateTitleDescriptionQuality } = require("./titleDescriptionQuality");
const { validateImageSet } = require("./imagePipeline");
const { validateSupplierCategoryMapping } = require("./categoryMappingValidator");
const { detectQualityDuplicates } = require("./productQualityDuplicateFlags");
const { normalizeBrand } = require("./brandNormalizer");
const { normalizeSku } = require("./skuNormalizer");

const DIMENSION_WEIGHTS = Object.freeze({
  IDENTITY: 20,
  ATTRIBUTES: 15,
  MANUFACTURER: 10,
  CATEGORY: 15,
  IMAGES: 15,
  TITLE: 10,
  DESCRIPTION: 5,
  COMMERCIAL: 10,
});

function normalizeRecordFields(record) {
  return {
    ...record,
    gtin: record.gtin || record.ean || record.ean_gtin,
    ean: record.ean || record.ean_gtin || record.gtin,
    title: record.title || record.name,
    name: record.name || record.title,
    supplierCategory: record.supplierCategory || record.supplier_category,
    buzzardCategory: record.buzzardCategory || record.buzzard_category || record.category,
    supplierSku: record.supplierSku || record.supplier_sku || record.sku,
    sku: record.sku || record.supplier_sku || record.supplierSku,
  };
}

function dimensionScore(status, weight) {
  if (status === QUALITY_STATUS.PASS) return weight;
  if (status === QUALITY_STATUS.CONDITION) return Math.floor(weight / 2);
  return 0;
}

function evaluateProductQualityHardening(record, options = {}) {
  const normalizedRecord = normalizeRecordFields(record);
  const findings = [];
  const dimensions = {};

  const identity = validateProductIdentity(normalizedRecord, options);
  dimensions.IDENTITY = identity.status;
  findings.push(...identity.findings);

  const attributes = evaluateAttributeQuality(normalizedRecord, options);
  dimensions.ATTRIBUTES = attributes.status;
  findings.push(...attributes.findings);

  const brand = normalizeBrand(normalizedRecord.brand || normalizedRecord.manufacturer);
  dimensions.MANUFACTURER =
    identity.findings.some((f) => f.field === "manufacturer" && f.severity === "BLOCKED")
      ? QUALITY_STATUS.BLOCKED
      : brand.unknown
        ? QUALITY_STATUS.CONDITION
        : QUALITY_STATUS.PASS;

  const categoryCheck = validateSupplierCategoryMapping({
    supplierCategory: normalizedRecord.supplierCategory,
    buzzardCategory: normalizedRecord.buzzardCategory,
    supplierCode: normalizedRecord.supplierCode || normalizedRecord.supplier,
  });
  dimensions.CATEGORY = categoryCheck.ok ? QUALITY_STATUS.PASS : QUALITY_STATUS.BLOCKED;
  if (!categoryCheck.ok) {
    findings.push(
      buildBlockReason(categoryCheck.code || BLOCKING_CODES.CATEGORY_UNKNOWN, "category", "Category mapping is invalid or unknown.")
    );
  }

  const imageCheck = validateImageSet(
    normalizedRecord.images || (normalizedRecord.primaryImage ? [normalizedRecord.primaryImage] : []),
    { requirePrimary: options.requireImage !== false }
  );
  dimensions.IMAGES = imageCheck.ok ? QUALITY_STATUS.PASS : QUALITY_STATUS.BLOCKED;
  if (!imageCheck.ok) {
    const imageCode =
      imageCheck.invalid?.[0]?.code || imageCheck.code || BLOCKING_CODES.IMAGE_MISSING;
    findings.push(
      buildBlockReason(imageCode, "images", "Primary image is missing or invalid.")
    );
  }

  const textQuality = evaluateTitleDescriptionQuality(normalizedRecord);
  dimensions.TITLE = textQuality.findings.some((f) => f.field === "title" && f.severity === "BLOCKED")
    ? QUALITY_STATUS.BLOCKED
    : textQuality.findings.some((f) => f.field === "title")
      ? QUALITY_STATUS.CONDITION
      : QUALITY_STATUS.PASS;
  dimensions.DESCRIPTION = textQuality.findings.some((f) => f.field === "description" && f.severity === "BLOCKED")
    ? QUALITY_STATUS.BLOCKED
    : textQuality.findings.some((f) => f.field === "description")
      ? QUALITY_STATUS.CONDITION
      : QUALITY_STATUS.PASS;
  findings.push(...textQuality.findings);

  const part16Quality = evaluateProductQuality(
    {
      ...normalizedRecord,
      supplierCode: normalizedRecord.supplierCode || normalizedRecord.supplier || options.supplierCode,
      provenance: normalizedRecord.provenance || {
        sourceSupplierCode: normalizedRecord.supplierCode || options.supplierCode,
        importedAt: new Date().toISOString(),
      },
    },
    options
  );
  dimensions.COMMERCIAL = part16Quality.ready
    ? QUALITY_STATUS.PASS
    : part16Quality.blockingReasons.length > 0
      ? QUALITY_STATUS.BLOCKED
      : QUALITY_STATUS.CONDITION;

  for (const code of part16Quality.blockingReasons) {
    if (!findings.some((f) => f.code === code)) {
      findings.push(buildBlockReason(code, "commercial", `Commercial readiness blocked: ${code}.`));
    }
  }

  const duplicates = detectQualityDuplicates(normalizedRecord, options);
  if (duplicates.flagged) {
    findings.push(...duplicates.findings);
    if (!dimensions.IDENTITY || dimensions.IDENTITY === QUALITY_STATUS.PASS) {
      dimensions.IDENTITY = QUALITY_STATUS.CONDITION;
    }
  }

  const maxWeight = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
  const score = Math.min(
    100,
    Math.round(
      (Object.entries(DIMENSION_WEIGHTS).reduce(
        (sum, [name, weight]) => sum + dimensionScore(dimensions[name] || QUALITY_STATUS.BLOCKED, weight),
        0
      ) /
        maxWeight) *
        100
    )
  );

  const hasBlocked = Object.values(dimensions).includes(QUALITY_STATUS.BLOCKED) ||
    findings.some((f) => f.severity === "BLOCKED");
  const hasCondition = Object.values(dimensions).includes(QUALITY_STATUS.CONDITION) ||
    findings.some((f) => f.severity === "CONDITION");

  const status = hasBlocked ? QUALITY_STATUS.BLOCKED : hasCondition ? QUALITY_STATUS.CONDITION : QUALITY_STATUS.PASS;

  return {
    status,
    score,
    diagnosticOnly: true,
    autoActivate: false,
    dimensionNames: HARDENING_DIMENSIONS,
    dimensions,
    findings,
    blockingReasons: [...new Set(findings.filter((f) => f.severity === "BLOCKED").map((f) => f.code))],
    duplicates: {
      flagged: duplicates.flagged,
      issues: duplicates.issues,
    },
    normalized: {
      ...identity.normalized,
      brand: brand.normalized,
      sku: normalizeSku(normalizedRecord.sku || normalizedRecord.supplierSku).normalized,
    },
    part16: {
      score: part16Quality.score,
      ready: part16Quality.ready,
      dimensions: part16Quality.dimensions,
    },
    explainable: true,
  };
}

module.exports = {
  evaluateProductQualityHardening,
  DIMENSION_WEIGHTS,
};
