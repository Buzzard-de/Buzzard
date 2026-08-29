const { db } = require("../db");
const { PRODUCT_STATUS, AUDIT_SOURCE } = require("../../core/productConstants");
const productCore = require("./productCore");
const productAudit = require("./productAudit");
const supplierMapping = require("./supplierMapping");
const categoryEngine = require("./categoryEngine");

function bulkUpdate(ids, patch, { source = AUDIT_SOURCE.ADMIN, actorId } = {}) {
  const results = [];
  for (const id of ids) {
    try {
      const updated = productCore.updateProduct(id, patch, { source, actorId });
      results.push({ id, ok: true, product: updated });
    } catch (err) {
      results.push({ id, ok: false, error: err.message });
    }
  }
  productAudit.logChange({
    productId: ids[0],
    action: "bulk.update",
    source,
    actorId,
    metadata: { ids, patch, results: results.filter((r) => !r.ok).length },
  });
  return results;
}

function bulkActivate(ids, actorId) {
  return bulkUpdate(
    ids,
    { status: PRODUCT_STATUS.READY, visibility: "HIDDEN" },
    { source: AUDIT_SOURCE.ADMIN, actorId }
  );
}

function bulkHide(ids, actorId) {
  return bulkUpdate(ids, { status: PRODUCT_STATUS.HIDDEN, visibility: "HIDDEN" }, { source: AUDIT_SOURCE.ADMIN, actorId });
}

function bulkArchive(ids, actorId) {
  return bulkUpdate(ids, { status: PRODUCT_STATUS.ARCHIVED }, { source: AUDIT_SOURCE.ADMIN, actorId });
}

function bulkCategoryChange(ids, taxonomyCategoryId, actorId) {
  const results = [];
  for (const id of ids) {
    categoryEngine.assignProductCategory(id, taxonomyCategoryId);
    results.push({ id, ok: true });
  }
  productAudit.logChange({
    productId: ids[0],
    action: "bulk.category",
    source: AUDIT_SOURCE.ADMIN,
    actorId,
    metadata: { ids, taxonomyCategoryId },
  });
  return results;
}

function bulkBrandMapping(ids, brandId, actorId) {
  return bulkUpdate(ids, { brandId }, { source: AUDIT_SOURCE.ADMIN, actorId });
}

function bulkSupplierMapping(mappingIds, internalProductId, actorId) {
  const product = productCore.getProduct(internalProductId);
  if (!product) throw new Error("Product not found");
  const results = mappingIds.map((mid) => {
    supplierMapping.linkToProduct(mid, internalProductId, product.sku);
    return { mappingId: mid, ok: true };
  });
  productAudit.logChange({
    productId: internalProductId,
    action: "bulk.supplier_mapping",
    source: AUDIT_SOURCE.ADMIN,
    actorId,
    metadata: { mappingIds },
  });
  return results;
}

module.exports = {
  bulkUpdate,
  bulkActivate,
  bulkHide,
  bulkArchive,
  bulkCategoryChange,
  bulkBrandMapping,
  bulkSupplierMapping,
};
