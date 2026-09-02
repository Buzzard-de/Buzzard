/**
 * Part 22 — Hierarchical duplicate detection (flag only, no auto-merge/delete).
 */
const productIdentifiers = require("./productIdentifiers");
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");
const { buildBlockReason } = require("../../core/productQualityHardeningConstants");
const { normalizeBrand } = require("./brandNormalizer");
const { normalizeSku } = require("./skuNormalizer");
const crypto = require("crypto");

function buildIdentityFingerprint(record) {
  const brand = normalizeBrand(record.brand || record.manufacturer).normalized || "";
  const sku = normalizeSku(record.sku || record.supplier_sku || record.supplierSku).normalized || "";
  const payload = `${brand}|${sku}`.toLowerCase();
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function detectQualityDuplicates(record, options = {}) {
  const flagged = [];
  const gtin = record.gtin || record.ean || record.ean_gtin;
  const mpn = record.mpn;
  const brand = normalizeBrand(record.brand || record.manufacturer).normalized;
  const sku = normalizeSku(record.sku || record.supplier_sku || record.supplierSku).normalized;

  if (gtin && !options.skipDbDuplicateCheck) {
    const dup = productIdentifiers.findDuplicate("gtin", gtin, options.excludeProductId);
    if (dup) {
      flagged.push({
        hierarchy: 1,
        field: "gtin",
        code: BLOCKING_CODES.DUPLICATE,
        existingSku: dup.sku,
        message: "Duplicate GTIN/EAN detected.",
      });
    }
  }

  if (mpn && brand && !options.skipDbDuplicateCheck) {
    const dup = productIdentifiers.findDuplicate("mpn", mpn, options.excludeProductId);
    if (dup) {
      flagged.push({
        hierarchy: 2,
        field: "mpn+manufacturer",
        code: BLOCKING_CODES.DUPLICATE,
        existingSku: dup.sku,
        message: "Duplicate MPN detected (verify manufacturer match).",
        manufacturer: brand,
      });
    }
  }

  if (sku && !options.skipDbDuplicateCheck) {
    const dup = productIdentifiers.findDuplicate("sku", sku, options.excludeProductId);
    if (dup) {
      flagged.push({
        hierarchy: 3,
        field: "sku",
        code: BLOCKING_CODES.DUPLICATE,
        existingSku: dup.sku,
        message: "Duplicate normalized SKU detected.",
      });
    }
  }

  const fingerprint = buildIdentityFingerprint(record);
  if (options.knownFingerprints?.has(fingerprint)) {
    flagged.push({
      hierarchy: 4,
      field: "identity_fingerprint",
      code: BLOCKING_CODES.DUPLICATE,
      fingerprint,
      message: "Duplicate identity fingerprint detected.",
    });
  }

  const findings = flagged.map((item) =>
    buildBlockReason(item.code, item.field, item.message, "CONDITION")
  );

  return {
    flagged: flagged.length > 0,
    issues: flagged,
    findings,
    fingerprint,
  };
}

module.exports = {
  detectQualityDuplicates,
  buildIdentityFingerprint,
};
