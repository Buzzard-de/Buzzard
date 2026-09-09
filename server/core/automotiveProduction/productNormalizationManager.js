/**
 * Automotive Production Integration — product normalization manager.
 */
const automotiveCore = require("../automotiveCore");
const { recordIntegrationAudit } = require("./integrationAudit");

function normalizeSupplierProduct(raw = {}, context = {}) {
  const normalized = automotiveCore.normalizeAutomotiveProduct({
    ...raw,
    sku: raw.sku || raw.supplierSku || raw.externalProductId,
    supplierId: raw.supplierId || context.supplierId,
    supplierSku: raw.supplierSku || raw.externalProductId,
    categoryId: raw.categoryId || raw.normalizedCategory,
    status: raw.status || "DRAFT",
  });

  recordIntegrationAudit({
    action: "PRODUCT_NORMALIZED",
    entityId: normalized.sku,
    supplierId: context.supplierId,
    metadata: { brand: normalized.brand, categoryId: normalized.categoryId },
  });

  return {
    ...normalized,
    source: raw.source || "supplier_feed",
    timestamps: {
      importedAt: new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
    },
  };
}

module.exports = {
  normalizeSupplierProduct,
};
