/**
 * Canonical Product SoT: D = pim_core_products (TARGET).
 * Exclusive lock is OFF unless BUZZARD_PRODUCT_SOT_EXCLUSIVE=1.
 * No production data migration. No fake exclusive-active claim.
 */
const crypto = require("crypto");
const { db } = require("./db");
const { MODE, label } = require("./integrationMode");
const { MODES, resolveSotMode } = require("./productSotMode");

const TARGET = "D";
const TARGET_TABLE = "pim_core_products";
const TARGET_MODULE = "productCore";

const SOURCE = Object.freeze({
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  G: "G",
});

function isExclusiveWriteEnabled() {
  if (process.env.BUZZARD_PRODUCT_SOT_EXCLUSIVE === "1") return true;
  return resolveSotMode().exclusive === true;
}

function isSotActive() {
  return process.env.BUZZARD_PRODUCT_SOT_ACTIVE === "1" && isExclusiveWriteEnabled();
}

function getSotMode() {
  return resolveSotMode();
}

function getStatus() {
  const sotMode = resolveSotMode();
  return {
    target: TARGET,
    targetTable: TARGET_TABLE,
    targetModule: TARGET_MODULE,
    selected: true,
    sotMode: sotMode.mode,
    requestedSotMode: sotMode.requested,
    exclusiveWrite: isExclusiveWriteEnabled(),
    exclusiveBlockedReason: sotMode.blockedReason,
    active: isSotActive(),
    status: isSotActive() ? "ACTIVE" : "SELECTED_AS_TARGET / NOT_YET_ACTIVE",
    migration: sotMode.mode === MODES.MIGRATION ? "IN_PROGRESS" : "NOT_STARTED",
    identityUnified: false,
    productionIdentityExport: process.env.BUZZARD_PRODUCT_IDENTITY_PRODUCTION_EXPORT === "1" ? "AVAILABLE" : "BLOCKED_BY_PRODUCTION_ACCESS",
    mode: isSotActive() ? MODE.LIVE : MODE.DRY_RUN,
    ...label(isSotActive() ? MODE.LIVE : MODE.DRY_RUN),
  };
}

function assertCanonicalWrite(source) {
  const src = String(source || "").toUpperCase();
  if (src === SOURCE.D) return { ok: true, source: SOURCE.D };
  if (!isExclusiveWriteEnabled()) {
    return { ok: true, source: src, compatibility: true, exclusive: false };
  }
  const err = new Error(`Legacy product write locked (source=${src}). Canonical writer is D/${TARGET_MODULE}`);
  err.code = "product_sot_legacy_locked";
  err.status = 423;
  try {
    const exceptions = require("./exceptionBus");
    exceptions.emit({
      type: exceptions.TYPES.PRODUCT_WRITE_BLOCKED,
      severity: "HIGH",
      source: "productSot",
      entity: "product",
      message: err.message,
      context: { source: src },
      retryable: false,
    });
  } catch {
    /* bus may be mid-init */
  }
  throw err;
}

function upsertIdentityMap({
  sourceSystem,
  sourceId,
  sourceSku,
  targetProductId = null,
  targetSku = null,
  mappingStatus = "UNMAPPED",
  collisionStatus = "UNVERIFIED",
  confidence = 0,
  evidence = "code",
  eanGtin = null,
  normalizedBrand = null,
  normalizedModel = null,
  matchMethod = "UNMATCHED",
} = {}) {
  if (!sourceSystem || sourceId == null) {
    throw new Error("sourceSystem and sourceId required");
  }
  const id = `imap_${crypto.randomBytes(6).toString("hex")}`;
  const existing = db
    .prepare(
      "SELECT id FROM product_identity_map WHERE source_system = ? AND source_id = ?"
    )
    .get(String(sourceSystem), String(sourceId));

  if (existing) {
    db.prepare(
      `
      UPDATE product_identity_map SET
        source_sku = ?, target_product_id = ?, target_sku = ?,
        mapping_status = ?, collision_status = ?, confidence = ?, evidence = ?,
        ean_gtin = ?, normalized_brand = ?, normalized_model = ?,
        match_method = ?, match_confidence = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    ).run(
      sourceSku || null,
      targetProductId,
      targetSku,
      mappingStatus,
      collisionStatus,
      confidence,
      evidence,
      eanGtin,
      normalizedBrand,
      normalizedModel,
      matchMethod,
      confidence,
      existing.id
    );
    return getIdentity(existing.id);
  }

  db.prepare(
    `
    INSERT INTO product_identity_map(
      id, source_system, source_id, source_sku, target_system, target_product_id,
      target_sku, mapping_status, collision_status, confidence, evidence,
      ean_gtin, normalized_brand, normalized_model, match_method, match_confidence
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `
  ).run(
    id,
    String(sourceSystem),
    String(sourceId),
    sourceSku || null,
    TARGET,
    targetProductId,
    targetSku,
    mappingStatus,
    collisionStatus,
    confidence,
    evidence,
    eanGtin,
    normalizedBrand,
    normalizedModel,
    matchMethod,
    confidence
  );
  return getIdentity(id);
}

function getIdentity(id) {
  return db.prepare("SELECT * FROM product_identity_map WHERE id = ?").get(id) || null;
}

function listIdentityMaps({ sourceSystem, limit = 50 } = {}) {
  if (sourceSystem) {
    return db
      .prepare(
        "SELECT * FROM product_identity_map WHERE source_system = ? ORDER BY updated_at DESC LIMIT ?"
      )
      .all(sourceSystem, limit);
  }
  return db.prepare("SELECT * FROM product_identity_map ORDER BY updated_at DESC LIMIT ?").all(limit);
}

function findBySource(sourceSystem, sourceId) {
  return db
    .prepare("SELECT * FROM product_identity_map WHERE source_system = ? AND source_id = ?")
    .get(String(sourceSystem), String(sourceId));
}

function findBySku(sku) {
  if (!sku) return [];
  return db
    .prepare("SELECT * FROM product_identity_map WHERE source_sku = ? OR target_sku = ?")
    .all(sku, sku);
}

module.exports = {
  TARGET,
  TARGET_TABLE,
  TARGET_MODULE,
  SOURCE,
  isExclusiveWriteEnabled,
  isSotActive,
  getSotMode,
  getStatus,
  assertCanonicalWrite,
  upsertIdentityMap,
  getIdentity,
  listIdentityMaps,
  findBySource,
  findBySku,
};
