/**
 * Match A–G candidates to D. Never auto-merges low-confidence collisions.
 */
const crypto = require("crypto");
const { db } = require("./db");
const productSot = require("./productSot");
const exceptions = require("./exceptionBus");

const MATCH_METHOD = Object.freeze({
  EXACT_EAN: "EXACT_EAN",
  EXACT_SOURCE_ID: "EXACT_SOURCE_ID",
  EXACT_SKU: "EXACT_SKU",
  BRAND_MODEL: "BRAND_MODEL",
  MANUAL: "MANUAL",
  UNMATCHED: "UNMATCHED",
});

const COLLISION = Object.freeze({
  NONE: "NONE",
  POSSIBLE: "POSSIBLE",
  CONFIRMED: "CONFIRMED",
  RESOLVED: "RESOLVED",
});

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function confidenceFor(method) {
  if (method === MATCH_METHOD.EXACT_EAN || method === MATCH_METHOD.EXACT_SOURCE_ID) return 0.99;
  if (method === MATCH_METHOD.EXACT_SKU) return 0.9;
  if (method === MATCH_METHOD.BRAND_MODEL) return 0.55;
  if (method === MATCH_METHOD.MANUAL) return 1;
  return 0;
}

function findCanonicalTargets(candidate = {}) {
  const ean = String(candidate.ean || candidate.ean_gtin || candidate.gtin || "").trim();
  const sku = String(candidate.sku || candidate.sourceSku || "").trim();
  const sourceId = String(candidate.sourceId || candidate.id || "").trim();
  const brand = normalize(candidate.brand || candidate.normalized_brand);
  const model = normalize(candidate.model || candidate.title || candidate.normalized_model);

  if (ean) {
    const byEan = db
      .prepare("SELECT id, sku FROM pim_core_products WHERE ean = ? OR gtin = ?")
      .all(ean, ean);
    if (byEan.length === 1) {
      return { method: MATCH_METHOD.EXACT_EAN, targets: byEan, ean };
    }
    if (byEan.length > 1) {
      return { method: MATCH_METHOD.EXACT_EAN, targets: byEan, ean, collision: COLLISION.CONFIRMED };
    }
  }

  if (sourceId) {
    const byId = db.prepare("SELECT id, sku FROM pim_core_products WHERE id = ?").get(sourceId);
    if (byId) return { method: MATCH_METHOD.EXACT_SOURCE_ID, targets: [byId], ean };
  }

  if (sku) {
    const bySku = db.prepare("SELECT id, sku FROM pim_core_products WHERE sku = ?").all(sku);
    if (bySku.length === 1) return { method: MATCH_METHOD.EXACT_SKU, targets: bySku, ean };
    if (bySku.length > 1) {
      return { method: MATCH_METHOD.EXACT_SKU, targets: bySku, ean, collision: COLLISION.CONFIRMED };
    }
  }

  if (brand && model) {
    const byBrandModel = db
      .prepare(
        `SELECT p.id, p.sku FROM pim_core_products p
         LEFT JOIN pim_core_brands b ON b.id = p.brand_id
         WHERE lower(coalesce(b.name, p.manufacturer, '')) = ? AND lower(p.title) = ?`
      )
      .all(brand, model);
    if (byBrandModel.length === 1) {
      return { method: MATCH_METHOD.BRAND_MODEL, targets: byBrandModel, ean };
    }
    if (byBrandModel.length > 1) {
      return { method: MATCH_METHOD.BRAND_MODEL, targets: byBrandModel, ean, collision: COLLISION.POSSIBLE };
    }
  }

  return { method: MATCH_METHOD.UNMATCHED, targets: [], ean };
}

function enqueueReview({ mapId, source, sourceId, reason, collisionStatus }) {
  const id = `rev_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare(
    `
    INSERT INTO product_identity_review_queue(
      id, map_id, source_system, source_id, reason, collision_status, status
    ) VALUES (?,?,?,?,?,?, 'PENDING')
  `
  ).run(id, mapId || null, source, sourceId, reason, collisionStatus);
  return id;
}

function auditMatch({ mapId, source, sourceId, method, confidence, collisionStatus }) {
  const id = `maud_${crypto.randomBytes(6).toString("hex")}`;
  db.prepare(
    `
    INSERT INTO product_identity_match_audit(
      id, map_id, source_system, source_id, match_method, confidence, collision_status
    ) VALUES (?,?,?,?,?,?,?)
  `
  ).run(id, mapId || null, source, sourceId, method, confidence, collisionStatus);
  return id;
}

function proposeMapping(candidate = {}) {
  const source = String(candidate.source || candidate.sourceSystem || "").toUpperCase();
  const sourceId = String(candidate.sourceId || candidate.id || "").trim();
  if (!source || !sourceId) throw new Error("source and sourceId required");

  const match = findCanonicalTargets(candidate);
  const confidence = candidate.match_method === MATCH_METHOD.MANUAL
    ? 1
    : confidenceFor(match.method);
  const lowConfidence = confidence < 0.8;
  let collisionStatus = match.collision || COLLISION.NONE;
  if (match.method === MATCH_METHOD.UNMATCHED) collisionStatus = COLLISION.NONE;
  if (lowConfidence && match.targets.length === 1) collisionStatus = COLLISION.POSSIBLE;
  if (match.targets.length > 1) {
    collisionStatus = match.collision || COLLISION.POSSIBLE;
  }

  const target = match.targets.length === 1 && !lowConfidence ? match.targets[0] : null;
  const mappingStatus = target ? "MAPPED" : match.method === MATCH_METHOD.UNMATCHED ? "UNMAPPED" : "REVIEW";

  const row = productSot.upsertIdentityMap({
    sourceSystem: source,
    sourceId,
    sourceSku: candidate.sku || candidate.sourceSku || null,
    targetProductId: target ? target.id : null,
    targetSku: target ? target.sku : null,
    mappingStatus,
    collisionStatus,
    confidence,
    evidence: `collisionDetector.${match.method}`,
    eanGtin: match.ean || candidate.ean || candidate.ean_gtin || null,
    normalizedBrand: normalize(candidate.brand),
    normalizedModel: normalize(candidate.model || candidate.title),
    matchMethod: match.method,
  });

  auditMatch({
    mapId: row.id,
    source,
    sourceId,
    method: match.method,
    confidence,
    collisionStatus,
  });

  if (collisionStatus === COLLISION.POSSIBLE || collisionStatus === COLLISION.CONFIRMED) {
    enqueueReview({
      mapId: row.id,
      source,
      sourceId,
      reason: `${match.method} produced ${match.targets.length} target(s); no auto-merge`,
      collisionStatus,
    });
    try {
      exceptions.emit({
        type: exceptions.TYPES.PRODUCT_IDENTITY_CONFLICT,
        severity: collisionStatus === COLLISION.CONFIRMED ? "HIGH" : "MEDIUM",
        source: "productCollisionDetector",
        entity: "product_identity_map",
        entityId: row.id,
        message: "Identity collision queued for review",
        context: { method: match.method, targets: match.targets.map((t) => t.id) },
        retryable: false,
      });
    } catch {
      /* exception types must exist */
    }
  }

  return {
    mapping: row,
    method: match.method,
    confidence,
    collisionStatus,
    merged: false,
    targets: match.targets,
  };
}

function listReviewQueue({ status = "PENDING", limit = 50 } = {}) {
  return db
    .prepare(
      "SELECT * FROM product_identity_review_queue WHERE status = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(status, limit);
}

module.exports = {
  MATCH_METHOD,
  COLLISION,
  proposeMapping,
  findCanonicalTargets,
  listReviewQueue,
  enqueueReview,
};
