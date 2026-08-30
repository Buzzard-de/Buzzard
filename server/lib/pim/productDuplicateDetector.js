/**
 * Part 16 — Duplicate product detection (staging + PIM Core).
 */
const { db } = require("../db");
const productIdentifiers = require("./productIdentifiers");
const { BLOCKING_CODES } = require("../../core/productLifecycleConstants");

function findStagingDuplicate({ supplierCode, sourceProductId, supplierSku, excludeId } = {}) {
  if (sourceProductId && supplierCode) {
    const row = db
      .prepare(
        `SELECT id, supplier_sku, lifecycle_status FROM pim_core_product_staging
         WHERE source_supplier_code = ? AND source_product_id = ?`
      )
      .get(supplierCode, sourceProductId);
    if (row && row.id !== excludeId) return { field: "source_product_id", row };
  }

  if (supplierSku && supplierCode) {
    const row = db
      .prepare(
        `SELECT id, supplier_sku, lifecycle_status FROM pim_core_product_staging
         WHERE source_supplier_code = ? AND supplier_sku = ?`
      )
      .get(supplierCode, supplierSku);
    if (row && row.id !== excludeId) return { field: "supplier_sku", row };
  }

  return null;
}

function detectDuplicates(normalized, { excludeStagingId, excludeProductId } = {}) {
  const issues = [];

  const stagingDup = findStagingDuplicate({
    supplierCode: normalized.supplierCode,
    sourceProductId: normalized.sourceProductId,
    supplierSku: normalized.supplierSku,
    excludeId: excludeStagingId,
  });
  if (stagingDup) {
    issues.push({
      code: BLOCKING_CODES.DUPLICATE,
      scope: "staging",
      field: stagingDup.field,
      existingId: stagingDup.row.id,
      existingSku: stagingDup.row.supplier_sku,
    });
  }

  const identifierIssues = productIdentifiers.checkIdentifiers({
    sku: normalized.sku,
    ean: normalized.ean,
    gtin: normalized.gtin,
    mpn: normalized.mpn,
    excludeId: excludeProductId,
  });
  for (const issue of identifierIssues) {
    issues.push({
      code: BLOCKING_CODES.DUPLICATE,
      scope: "pim_core",
      field: issue.field,
      value: issue.value,
      existingSku: issue.existingSku,
    });
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

module.exports = {
  findStagingDuplicate,
  detectDuplicates,
};
