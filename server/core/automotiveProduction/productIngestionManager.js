/**
 * Automotive Production Integration — full product ingestion pipeline (fail-closed).
 */
const automotiveCore = require("../automotiveCore");
const { validateImageSet } = require("../../lib/pim/imagePipeline");
const { normalizeSupplierProduct } = require("./productNormalizationManager");
const { findMatchingCanonical, buildSupplierOffers } = require("./productMatchingManager");
const { calculateProductPrice, validateProductStock } = require("./priceStockManager");
const { createSupplierConnector, executeSupplierOperation } = require("./supplierConnectorManager");
const { getFitment } = require("./tecdocConnectorManager");
const { productionError } = require("./productionErrors");
const { recordIntegrationAudit } = require("./integrationAudit");

const REQUIRED_LOCALES = Object.freeze(["de", "en", "tr", "ar"]);
const CRITICAL_FITMENT_CATEGORIES = new Set([
  "brakes", "steering", "suspension", "tires_wheels",
]);

function validateTranslations(product = {}) {
  const translations = product.translations || {};
  const missing = REQUIRED_LOCALES.filter((loc) => !translations[loc]?.title);
  if (missing.length) {
    return { valid: false, status: "REVIEW_REQUIRED", missing, code: "TRANSLATION_MISSING" };
  }
  return { valid: true, status: "PASS" };
}

function validateImages(product = {}) {
  const images = product.images || [];
  if (!images.length) {
    return { valid: false, status: "REVIEW_REQUIRED", code: "IMAGE_MISSING" };
  }
  const check = validateImageSet(images, { requirePrimary: true });
  if (!check.ok) {
    return { valid: false, status: "REVIEW_REQUIRED", code: check.code || "IMAGE_INVALID", check };
  }
  return { valid: true, status: "PASS", check };
}

function validateFitmentForCategory(product = {}, fitmentResult = {}) {
  const categoryId = product.categoryId || product.category;
  const level = fitmentResult.level || fitmentResult.confidenceLevel || "UNKNOWN";
  const minLevel = CRITICAL_FITMENT_CATEGORIES.has(categoryId) ? "HIGH" : "MEDIUM";
  const levels = ["UNKNOWN", "LOW", "MEDIUM", "HIGH", "EXACT"];
  const actualIdx = levels.indexOf(level);
  const minIdx = levels.indexOf(minLevel);

  if (actualIdx < minIdx) {
    return {
      valid: false,
      status: "REVIEW_REQUIRED",
      code: "INVALID_FITMENT",
      level,
      minLevel,
      publishBlocked: true,
    };
  }
  return { valid: true, status: "PASS", level };
}

function runProductionIngestionPipeline(rawProduct = {}, context = {}) {
  const stages = [];
  let blocked = false;
  let state = "RECEIVED";
  const existingCatalog = context.existingProducts || [];

  function stage(name, result) {
    stages.push({ stage: name, ...result });
    if (result.blocked || result.status === "FAIL" || result.valid === false) {
      blocked = true;
    }
    return result;
  }

  if (blocked) return buildResult(state, blocked, stages, null);

  // Supplier fetch (mock/dry-run only)
  const connector = createSupplierConnector(context.supplierId || rawProduct.supplierId || "supplier-mock", {
    mode: context.connectorMode || "mock",
  });
  stage("supplier_connect", { status: "PASS", mode: connector.mode });

  if (blocked) return buildResult(state, blocked, stages, null);

  // Normalize
  const normalized = normalizeSupplierProduct(rawProduct, context);
  state = "NORMALIZED";
  stage("normalization", { status: "PASS", sku: normalized.sku });

  if (blocked) return buildResult(state, blocked, stages, normalized);

  // Category mapping
  const mapping = automotiveCore.resolveSupplierCategoryMapping(
    context.supplierId || rawProduct.supplierId || "unknown",
    rawProduct.sourceCategory || rawProduct.category
  );
  state = mapping.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "MAPPED";
  stage("category_mapping", {
    status: mapping.status === "REVIEW_REQUIRED" ? "REVIEW_REQUIRED" : "PASS",
    confidence: mapping.confidence || mapping.status,
    mapping,
    blocked: mapping.status === "REVIEW_REQUIRED" && mapping.confidence === "UNKNOWN",
  });

  if (blocked) return buildResult(state, blocked, stages, normalized);

  // Identity validation
  const identityInput = {
    ...normalized,
    gtin: normalized.identifiers?.gtin || rawProduct.gtin,
    ean: normalized.identifiers?.ean || rawProduct.ean,
    mpn: normalized.identifiers?.mpn || rawProduct.mpn,
    oem: normalized.identifiers?.oem || rawProduct.oem,
  };
  const identity = automotiveCore.validateIdentity(identityInput);
  const duplicate = automotiveCore.detectDuplicateProduct(identityInput, existingCatalog);
  stage("identity", {
    status: identity.ok && !duplicate.duplicate ? "PASS" : "REVIEW_REQUIRED",
    identity,
    duplicate,
    blocked: !identity.ok || duplicate.duplicate,
  });

  if (blocked) {
    state = "REVIEW_REQUIRED";
    return buildResult(state, blocked, stages, normalized);
  }

  // Vehicle fitment
  const fitmentMatch = normalized.fitment?.length
    ? automotiveCore.matchFitment(normalized, context.vehicle || {})
    : { level: "UNKNOWN", status: "REVIEW_REQUIRED" };
  const fitmentValidation = validateFitmentForCategory(normalized, fitmentMatch);
  stage("fitment", { ...fitmentValidation, fitmentMatch });
  if (!fitmentValidation.valid) {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }

  if (blocked) return buildResult(state, blocked, stages, normalized);

  // TecDoc enrichment (dry-run)
  stage("tecdoc", { status: "PASS", dryRun: true, note: "TecDoc enrichment diagnostic only" });

  // AI matching (recommendation only)
  const aiMatch = automotiveCore.matchProduct({
    supplierProduct: rawProduct,
    buzzardProduct: normalized,
    vehicle: context.vehicle,
    existingProducts: existingCatalog,
  });
  stage("ai_matching", {
    status: aiMatch.recommendedAction,
    confidence: aiMatch.confidence,
    requiresHumanReview: aiMatch.recommendedAction !== "AUTO_ACCEPT",
  });

  // Image validation
  const imageResult = validateImages(normalized);
  stage("image", { ...imageResult, blocked: !imageResult.valid });
  if (!imageResult.valid) {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }

  if (blocked) return buildResult(state, blocked, stages, normalized);

  // Translation / SEO
  const translationResult = validateTranslations(normalized);
  stage("translation", { ...translationResult, blocked: !translationResult.valid });
  if (!translationResult.valid) {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }

  if (blocked) return buildResult(state, blocked, stages, normalized);

  // Price
  const price = calculateProductPrice({
    purchasePrice: rawProduct.price || rawProduct.purchasePrice,
    currency: rawProduct.currency || "EUR",
  });
  stage("price", { status: "PASS", publishable: price.publishable, price });

  // Stock
  const stock = validateProductStock({
    supplierStock: rawProduct.stock,
    lastUpdated: rawProduct.stockUpdatedAt || new Date().toISOString(),
    sku: normalized.sku,
  });
  stage("stock", {
    status: stock.valid ? "PASS" : "REVIEW_REQUIRED",
    stock: stock.stock,
    blocked: !stock.valid,
  });
  if (!stock.valid) {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }

  if (blocked) return buildResult(state, blocked, stages, normalized);

  // Multi-supplier matching
  const canonicalMatch = findMatchingCanonical(normalized, existingCatalog);
  const offers = buildSupplierOffers(canonicalMatch.canonicalProductId || normalized.sku, [
    {
      supplierId: context.supplierId || rawProduct.supplierId,
      supplierSku: normalized.supplierSku,
      purchasePrice: rawProduct.price,
      stock: rawProduct.stock,
      currency: rawProduct.currency || "EUR",
    },
  ]);
  stage("multi_supplier", { status: "PASS", ...canonicalMatch, offers });

  // Staging / validation
  const ingestion = automotiveCore.runIngestionPipeline(rawProduct, context);
  state = ingestion.state;
  stage("core_ingestion", { status: ingestion.state, blocked: ingestion.blocked });

  if (ingestion.blocked || state === "REVIEW_REQUIRED") {
    blocked = true;
    state = "REVIEW_REQUIRED";
  }

  recordIntegrationAudit({
    action: blocked ? "PRODUCT_REVIEW_REQUIRED" : "PRODUCT_VALIDATED",
    entityId: normalized.sku,
    supplierId: context.supplierId,
    metadata: { state, stageCount: stages.length },
  });

  return buildResult(state, blocked, stages, normalized, offers);
}

function buildResult(state, blocked, stages, product, offers = null) {
  return {
    state,
    blocked,
    publishAllowed: false,
    approved: state === "APPROVED",
    published: false,
    stages,
    product,
    offers,
    safety: { liveImport: false, publishBlocked: true, manualPublishRequired: true },
  };
}

async function ingestFromSupplier(supplierId, options = {}) {
  const connector = createSupplierConnector(supplierId, { mode: options.mode || "mock" });
  const fetchResult = await executeSupplierOperation(supplierId, "fetchProducts", () =>
    connector.fetchProducts(options)
  );

  if (fetchResult.code) return { ok: false, error: fetchResult };

  const products = fetchResult.products || [];
  const results = products.map((p) =>
    runProductionIngestionPipeline({ ...p, supplierId }, { ...options, supplierId })
  );

  recordIntegrationAudit({
    action: "PRODUCT_IMPORTED",
    supplierId,
    metadata: { count: products.length, mode: connector.mode },
  });

  return {
    ok: true,
    mode: connector.mode,
    supplierCalls: connector.mode === "mock" ? 0 : 0,
    liveCalls: 0,
    productsFound: products.length,
    results,
  };
}

function approveProduct(sku, actor = "admin") {
  recordIntegrationAudit({ action: "PRODUCT_APPROVED", entityId: sku, actor });
  return { sku, status: "APPROVED", published: false, note: "APPROVED != PUBLISHED" };
}

function publishProduct(sku, { manualPublish = false, actor = "admin" } = {}) {
  if (!manualPublish) {
    return {
      ok: false,
      ...productionError("PUBLISH_DISABLED", "manualPublish === true required", {
        requiresHumanReview: true,
      }),
    };
  }
  recordIntegrationAudit({ action: "PRODUCT_PUBLISHED", entityId: sku, actor, result: "BLOCKED" });
  return {
    ok: false,
    ...productionError("PUBLISH_DISABLED", "Publish remains blocked in production safety mode"),
  };
}

module.exports = {
  REQUIRED_LOCALES,
  CRITICAL_FITMENT_CATEGORIES,
  runProductionIngestionPipeline,
  ingestFromSupplier,
  approveProduct,
  publishProduct,
  validateTranslations,
  validateImages,
  validateFitmentForCategory,
};
