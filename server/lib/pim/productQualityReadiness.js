/**
 * Part 16 — Deterministic product quality/readiness evaluation.
 * No AI guesses for factual identifiers.
 */
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");
const { validateGtin, validateMpn } = require("../supplier/realSupplierConnector");
const { isTestOnlySupplier } = require("../supplier/supplierProductionGuard");
const { isDemoOrTestProduct } = require("./demoProductGuard");
const { validatePriceStockRecord } = require("./priceStockSafety");
const { validateImageSet } = require("./imagePipeline");
const { validateSupplierCategoryMapping } = require("./categoryMappingValidator");
const { validateProvenance } = require("./productProvenance");
const { validateFitmentRecord } = require("./fitmentSchema");

const WEIGHTS = Object.freeze({
  gtin: 15,
  mpn: 12,
  brand: 8,
  title: 8,
  description: 6,
  images: 12,
  price: 8,
  stock: 6,
  category: 10,
  supplier: 8,
  provenance: 7,
  fitment: 0,
});

function evaluateDimension(name, passed, partial = false) {
  if (passed) return { name, score: WEIGHTS[name] || 0, status: "PASS" };
  if (partial) return { name, score: Math.floor((WEIGHTS[name] || 0) / 2), status: "PARTIAL" };
  return { name, score: 0, status: "FAIL" };
}

function evaluateProductQuality(record, options = {}) {
  const blockingReasons = [];
  const dimensions = [];
  const requireMpn = options.requireMpn !== false;
  const requireImage = options.requireImage !== false;
  const requireGtin = options.requireGtin !== false;
  const automotive = options.automotive === true;

  if (isDemoOrTestProduct(record)) {
    blockingReasons.push(BLOCKING_CODES.DEMO_PRODUCT);
    dimensions.push(evaluateDimension("supplier", false));
    return buildResult(blockingReasons, dimensions);
  }

  const gtinCheck = validateGtin(record.gtin || record.ean);
  if (requireGtin && !gtinCheck.ok) {
    blockingReasons.push(gtinCheck.code === "missing_gtin" ? BLOCKING_CODES.GTIN_MISSING : BLOCKING_CODES.GTIN_INVALID);
  }
  dimensions.push(evaluateDimension("gtin", gtinCheck.ok));

  const mpnCheck = validateMpn(record.mpn);
  if (requireMpn && !mpnCheck.ok) {
    blockingReasons.push(
      mpnCheck.code === "missing_mpn" ? BLOCKING_CODES.MPN_MISSING : BLOCKING_CODES.MPN_INVALID
    );
  }
  dimensions.push(evaluateDimension("mpn", mpnCheck.ok));

  if (!record.supplierCode && !record.supplier) {
    blockingReasons.push(BLOCKING_CODES.SUPPLIER_MISSING);
  } else if (
    isTestOnlySupplier({
      supplierId: record.supplierCode || record.supplier,
      apiUrl: record.sourceUrl,
    })
  ) {
    blockingReasons.push(BLOCKING_CODES.SUPPLIER_TEST_ONLY);
  }
  dimensions.push(
    evaluateDimension(
      "supplier",
      Boolean(record.supplierCode || record.supplier) &&
        !isTestOnlySupplier({ supplierId: record.supplierCode || record.supplier })
    )
  );

  const brandOk = Boolean(String(record.brand || record.manufacturer || "").trim());
  if (!brandOk) blockingReasons.push(BLOCKING_CODES.BRAND_MISSING);
  dimensions.push(evaluateDimension("brand", brandOk));

  const titleOk = String(record.title || record.name || "").trim().length >= 3;
  if (!titleOk) blockingReasons.push(BLOCKING_CODES.TITLE_MISSING);
  dimensions.push(evaluateDimension("title", titleOk));

  const descOk = String(record.description || "").trim().length >= 10;
  dimensions.push(evaluateDimension("description", descOk, titleOk && !descOk));

  const imageCheck = validateImageSet(record.images || (record.primaryImage ? [record.primaryImage] : []), {
    requirePrimary: requireImage,
  });
  if (requireImage && !imageCheck.ok) {
    blockingReasons.push(imageCheck.code || BLOCKING_CODES.IMAGE_MISSING);
  }
  dimensions.push(evaluateDimension("images", imageCheck.ok));

  const priceStock = validatePriceStockRecord(record, { allowMissing: !options.requirePrice });
  if (options.requirePrice && !priceStock.ok) {
    for (const code of priceStock.errors) {
      if (code.includes("PRICE")) blockingReasons.push(BLOCKING_CODES.PRICE_INVALID);
      if (code.includes("STOCK")) blockingReasons.push(BLOCKING_CODES.STOCK_INVALID);
      if (code.includes("CURRENCY")) blockingReasons.push(BLOCKING_CODES.CURRENCY_INVALID);
    }
  }
  dimensions.push(evaluateDimension("price", priceStock.errors.every((c) => !c.includes("PRICE"))));
  dimensions.push(evaluateDimension("stock", priceStock.errors.every((c) => !c.includes("STOCK"))));

  const categoryCheck = validateSupplierCategoryMapping({
    supplierCategory: record.supplierCategory,
    buzzardCategory: record.buzzardCategory || record.category,
    supplierCode: record.supplierCode,
  });
  if (!categoryCheck.ok) blockingReasons.push(categoryCheck.code);
  dimensions.push(evaluateDimension("category", categoryCheck.ok));

  const provenanceCheck = validateProvenance(record.provenance || {
    sourceSupplierCode: record.supplierCode,
    importedAt: record.importedAt,
  });
  if (!provenanceCheck.ok) blockingReasons.push(...provenanceCheck.issues);
  dimensions.push(evaluateDimension("provenance", provenanceCheck.ok));

  const fitmentCheck = validateFitmentRecord(record, { requireFitment: automotive && options.requireFitment });
  if (!fitmentCheck.ok) blockingReasons.push(...fitmentCheck.issues);
  if (automotive) dimensions.push(evaluateDimension("fitment", fitmentCheck.fitment.length > 0, false));

  return buildResult([...new Set(blockingReasons)], dimensions, {
    fitment: fitmentCheck,
    category: categoryCheck.mapping,
    priceStock: priceStock.normalized,
    images: imageCheck,
  });
}

function buildResult(blockingReasons, dimensions, extras = {}) {
  const maxScore = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const score = Math.min(100, Math.round((dimensions.reduce((s, d) => s + d.score, 0) / maxScore) * 100));
  const ready = blockingReasons.length === 0 && score >= 80;

  return {
    ready,
    score,
    blockingReasons,
    dimensions,
    ...extras,
  };
}

module.exports = {
  evaluateProductQuality,
  WEIGHTS,
};
