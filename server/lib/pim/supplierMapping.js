const crypto = require("crypto");
const { db } = require("../db");
const { AUDIT_SOURCE } = require("../../core/productConstants");

function newId() {
  return `psmap_${crypto.randomBytes(6).toString("hex")}`;
}

function createMapping(input) {
  const id = newId();
  db.prepare(`
    INSERT INTO pim_core_supplier_mappings(
      id, supplier_id, supplier_product_id, supplier_sku, internal_product_id, internal_sku,
      ean, gtin, mpn, brand, confidence, metadata_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    input.supplierId,
    input.supplierProductId || null,
    input.supplierSku || null,
    input.internalProductId || null,
    input.internalSku || null,
    input.ean || null,
    input.gtin || null,
    input.mpn || null,
    input.brand || null,
    input.confidence ?? 0.5,
    JSON.stringify(input.metadata || {})
  );
  return getMapping(id);
}

function getMapping(id) {
  const row = db.prepare("SELECT * FROM pim_core_supplier_mappings WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierProductId: row.supplier_product_id,
    supplierSku: row.supplier_sku,
    internalProductId: row.internal_product_id,
    internalSku: row.internal_sku,
    ean: row.ean,
    gtin: row.gtin,
    mpn: row.mpn,
    brand: row.brand,
    confidence: row.confidence,
  };
}

function listMappings({ supplierId, internalProductId, limit = 50 } = {}) {
  let sql = "SELECT * FROM pim_core_supplier_mappings WHERE 1=1";
  const params = [];
  if (supplierId) {
    sql += " AND supplier_id = ?";
    params.push(supplierId);
  }
  if (internalProductId) {
    sql += " AND internal_product_id = ?";
    params.push(internalProductId);
  }
  sql += " ORDER BY updated_at DESC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params).map((row) => getMapping(row.id));
}

function linkToProduct(mappingId, internalProductId, internalSku) {
  db.prepare(`
    UPDATE pim_core_supplier_mappings SET internal_product_id = ?, internal_sku = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(internalProductId, internalSku, mappingId);
  return getMapping(mappingId);
}

module.exports = { createMapping, getMapping, listMappings, linkToProduct };
