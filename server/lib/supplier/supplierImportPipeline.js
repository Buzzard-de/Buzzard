/**
 * Part 23 — Supplier import pipeline (dry-run default, no live publish).
 *
 * supplier → adapter → raw staging → normalization → validation →
 * quality hardening → category validation → duplicate detection → PIM staging
 */
const { getSupplierAdapter } = require("./supplierRegistry");
const { mapSupplierProduct } = require("./supplierMappingService");
const { evaluatePriceStockReadiness } = require("./supplierPriceStockReadiness");
const { evaluateProductQualityHardening } = require("../pim/productQualityHardening");
const { detectQualityDuplicates } = require("../pim/productQualityDuplicateFlags");
const importPipeline = require("../pim/importPipeline");
const { requireSupplierOperation } = require("./supplierSafetyGate");
const { buildIdempotencyKey } = require("./supplierErrors");
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");

function normalizeRecordFields(raw) {
  return {
    supplier_sku: raw.supplier_sku || raw.supplierSku || raw.sku,
    name: raw.name || raw.title,
    ean_gtin: raw.ean_gtin || raw.gtin || raw.ean,
    mpn: raw.mpn,
    brand: raw.brand,
    supplier_category: raw.supplier_category || raw.category,
    buzzard_category: raw.buzzard_category,
    supplier_price: raw.supplier_price || (raw.price != null ? { amount: raw.price, currency: raw.currency || "EUR" } : null),
    stock: raw.stock,
    images: raw.images || [],
    attributes: raw.attributes || [],
  };
}

async function runSupplierImportPipeline(supplierId, options = {}) {
  const dryRun = options.dryRun !== false;
  const correlationId = options.correlationId || buildIdempotencyKey({
    supplierId,
    action: "import",
    payload: { dryRun, limit: options.limit },
  });

  requireSupplierOperation("import_dry_run", {
    req: options.req,
    body: options.body,
    dryRun: true,
    supplierId,
  });

  const adapter = getSupplierAdapter(supplierId);
  if (!adapter) {
    return {
      ok: false,
      dryRun: true,
      correlationId,
      error: "unknown_supplier",
      stages: [],
    };
  }

  const stages = [];
  stages.push({ stage: "supplier", status: "PASS", supplierId });

  let rawRecords = options.records;
  if (!rawRecords) {
    const fetchResult = adapter.fetchProductsDryRun
      ? await adapter.fetchProductsDryRun({ limit: options.limit || 10 })
      : { records: [], dryRun: true };
    rawRecords = fetchResult.records || [];
    stages.push({
      stage: "adapter",
      status: "PASS",
      dryRun: true,
      recordCount: rawRecords.length,
      format: adapter.adapterFormat || adapter.format,
    });
  } else {
    stages.push({ stage: "adapter", status: "PASS", dryRun: true, recordCount: rawRecords.length });
  }

  const processed = [];
  const knownFingerprints = new Set(options.knownFingerprints || []);

  for (const raw of rawRecords) {
    const normalized = normalizeRecordFields(raw);
    const mapping = mapSupplierProduct(normalized, {
      supplierId,
      buzzardCategory: normalized.buzzard_category,
    });
    const priceStock = evaluatePriceStockReadiness(normalized, { updatedAt: raw.updatedAt });
    const quality = evaluateProductQualityHardening(
      { ...normalized, supplierCode: supplierId },
      { supplierCode: supplierId, skipDbDuplicateCheck: options.skipDbDuplicateCheck !== false }
    );
    const dup = detectQualityDuplicates(normalized, {
      knownFingerprints,
      skipDbDuplicateCheck: options.skipDbDuplicateCheck !== false,
    });
    if (dup.fingerprint) knownFingerprints.add(dup.fingerprint);

    let pimStaging = null;
    if (!mapping.ok || quality.status === "BLOCKED" || dup.flagged) {
      pimStaging = { status: "BLOCKED", reason: dup.flagged ? "duplicate" : "validation" };
    } else if (dryRun) {
      pimStaging = { status: "DRY_RUN", lifecycleStatus: "STAGED" };
    } else {
      pimStaging = { status: "BLOCKED", reason: "live_publish_blocked" };
    }

    processed.push({
      supplierSku: normalized.supplier_sku,
      mapping: { status: mapping.status, findings: mapping.findings },
      priceStock: { status: priceStock.status },
      quality: { status: quality.status, score: quality.score },
      duplicate: { flagged: dup.flagged, matchType: dup.matchType },
      pimStaging,
    });
  }

  stages.push({
    stage: "normalization",
    status: "PASS",
    count: processed.length,
  });
  stages.push({
    stage: "validation",
    status: processed.some((p) => p.mapping.status === SUPPLIER_READINESS_STATUS.BLOCKED) ? "CONDITION" : "PASS",
  });
  stages.push({
    stage: "quality_hardening",
    status: processed.some((p) => p.quality.status === "BLOCKED") ? "CONDITION" : "PASS",
  });
  stages.push({
    stage: "duplicate_detection",
    status: processed.some((p) => p.duplicate.flagged) ? "CONDITION" : "PASS",
  });
  stages.push({
    stage: "pim_staging",
    status: "PASS",
    dryRun: true,
    livePublish: false,
  });

  return {
    ok: true,
    dryRun: true,
    live: false,
    correlationId,
    supplierId,
    stages,
    processed,
    summary: {
      total: processed.length,
      blocked: processed.filter((p) => p.pimStaging?.status === "BLOCKED").length,
      staged: processed.filter((p) => p.pimStaging?.status === "DRY_RUN").length,
    },
  };
}

async function validateSupplierRecords(supplierId, records = [], options = {}) {
  requireSupplierOperation("validate", { dryRun: true, supplierId, req: options.req });
  const results = [];
  for (const raw of records) {
    const normalized = normalizeRecordFields(raw);
    const mapping = mapSupplierProduct(normalized, { supplierId, buzzardCategory: normalized.buzzard_category });
    const priceStock = evaluatePriceStockReadiness(normalized);
    const quality = evaluateProductQualityHardening(
      { ...normalized, supplierCode: supplierId },
      { supplierCode: supplierId, skipDbDuplicateCheck: options.skipDbDuplicateCheck !== false }
    );
    results.push({
      supplierSku: normalized.supplier_sku,
      mapping,
      priceStock,
      quality: { status: quality.status, score: quality.score, blockingReasons: quality.blockingReasons },
    });
  }
  return { ok: true, dryRun: true, supplierId, results };
}

module.exports = {
  runSupplierImportPipeline,
  validateSupplierRecords,
  normalizeRecordFields,
};
