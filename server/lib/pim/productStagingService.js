/**
 * Part 16 — Product import staging service.
 * Flow: SUPPLIER → RAW → NORMALIZE → VALIDATE → STAGING → (manual) PIM CORE
 */
const crypto = require("crypto");
const { db } = require("../db");
const { STAGING_LIFECYCLE } = require("../../core/productLifecycleConstants");
const { runValidationPipeline } = require("./productValidationPipeline");
const { serializeProvenance, parseProvenance, touchProvenance } = require("./productProvenance");
const { canPromoteToPim, transitionStagingStatus } = require("./productLifecycle");
const { assertProductionSafety } = require("./productionSafetyGate");
const productCore = require("./productCore");
const { AUDIT_SOURCE, PRODUCT_STATUS } = require("../../core/productConstants");
const { STOREFRONT_VISIBILITY } = require("../../core/storefrontConstants");

function stagingId() {
  return `stg_${crypto.randomBytes(8).toString("hex")}`;
}

function mapStagingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    importJobId: row.import_job_id,
    sourceSupplierCode: row.source_supplier_code,
    sourceProductId: row.source_product_id,
    supplierSku: row.supplier_sku,
    lifecycleStatus: row.lifecycle_status,
    blockedReason: row.blocked_reason,
    duplicateOf: row.duplicate_of,
    importedProductId: row.imported_product_id,
    raw: parseJson(row.raw_json),
    normalized: parseJson(row.normalized_json),
    provenance: parseProvenance(row.provenance_json),
    validation: parseJson(row.validation_json),
    quality: parseJson(row.quality_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    importedAt: row.imported_at,
    validatedAt: row.validated_at,
  };
}

function parseJson(val) {
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

function ingestRawProduct(raw, options = {}) {
  const dryRun = options.dryRun !== false;
  const importJobId = options.importJobId || `imp_${Date.now()}`;
  const pipeline = runValidationPipeline(raw, { ...options, importJobId });

  if (dryRun) {
    return {
      dryRun: true,
      importJobId,
      wouldCreate: true,
      blocked: pipeline.blocked,
      lifecycleStatus: pipeline.lifecycleStatus,
      blockingReasons: pipeline.blockingReasons,
      quality: pipeline.quality,
      normalized: pipeline.normalized,
      provenance: pipeline.provenance,
      stages: pipeline.stages,
    };
  }

  const id = stagingId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO pim_core_product_staging(
      id, import_job_id, source_supplier_code, source_product_id, supplier_sku,
      raw_json, normalized_json, provenance_json, validation_json, quality_json,
      lifecycle_status, blocked_reason, created_at, updated_at, validated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    importJobId,
    pipeline.normalized?.supplierCode || options.supplierCode,
    pipeline.normalized?.sourceProductId || null,
    pipeline.normalized?.supplierSku || null,
    JSON.stringify(raw),
    JSON.stringify(pipeline.normalized || {}),
    serializeProvenance(pipeline.provenance),
    JSON.stringify({ blockingReasons: pipeline.blockingReasons, stages: pipeline.stages }),
    JSON.stringify(pipeline.quality || {}),
    pipeline.lifecycleStatus,
    pipeline.blockingReasons.join(", ") || null,
    now,
    now,
    pipeline.lifecycleStatus === STAGING_LIFECYCLE.VALIDATED ? now : null
  );

  return {
    dryRun: false,
    importJobId,
    stagingId: id,
    lifecycleStatus: pipeline.lifecycleStatus,
    blockingReasons: pipeline.blockingReasons,
    quality: pipeline.quality,
    record: getStagingRecord(id),
  };
}

function getStagingRecord(id) {
  const row = db.prepare("SELECT * FROM pim_core_product_staging WHERE id = ?").get(id);
  return mapStagingRow(row);
}

function listStagingRecords({ status, supplierCode, limit = 100 } = {}) {
  let sql = "SELECT * FROM pim_core_product_staging WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND lifecycle_status = ?";
    params.push(status);
  }
  if (supplierCode) {
    sql += " AND source_supplier_code = ?";
    params.push(supplierCode);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(Math.min(limit, 500));
  return db.prepare(sql).all(...params).map(mapStagingRow);
}

function promoteToPimCore(stagingId, { actorId, dryRun = true } = {}) {
  const record = getStagingRecord(stagingId);
  if (!record) return { ok: false, error: "staging_not_found" };

  const gate = canPromoteToPim(record);
  if (!gate.ok) return { ok: false, error: gate.reason, details: gate };

  const n = record.normalized;
  const payload = {
    sku: n.sku || `${record.sourceSupplierCode}-${n.supplierSku}`.slice(0, 64),
    supplierSku: n.supplierSku,
    ean: n.ean,
    gtin: n.gtin,
    mpn: n.mpn,
    title: n.title,
    description: n.description,
    shortDescription: n.shortDescription,
    category: n.buzzardCategory || n.supplierCategory,
    brand: n.brand,
    price: n.retailPrice || n.purchasePrice,
    stock: n.stock ?? 0,
    supplier: record.sourceSupplierCode,
    images: n.images || [],
    metadata: {
      provenance: record.provenance,
      purchasePrice: n.purchasePrice,
      currency: n.currency,
      stagingId: record.id,
    },
  };

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      wouldCreate: payload,
      stagingId,
    };
  }

  assertProductionSafety();

  const product = productCore.createProduct(
    {
      ...payload,
      status: PRODUCT_STATUS.IMPORTED,
      visibility: STOREFRONT_VISIBILITY.HIDDEN,
    },
    { source: AUDIT_SOURCE.IMPORT, actorId }
  );

  const transition = transitionStagingStatus(record.lifecycleStatus, STAGING_LIFECYCLE.PROMOTED);
  if (transition.ok) {
    db.prepare(`
      UPDATE pim_core_product_staging
      SET lifecycle_status = ?, imported_product_id = ?, imported_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(STAGING_LIFECYCLE.PROMOTED, product.id, stagingId);
  }

  return { ok: true, dryRun: false, product, stagingId };
}

function getStagingStats() {
  const rows = db
    .prepare(
      `SELECT lifecycle_status, COUNT(*) n FROM pim_core_product_staging GROUP BY lifecycle_status`
    )
    .all();
  return Object.fromEntries(rows.map((r) => [r.lifecycle_status, r.n]));
}

module.exports = {
  ingestRawProduct,
  getStagingRecord,
  listStagingRecords,
  promoteToPimCore,
  getStagingStats,
};
