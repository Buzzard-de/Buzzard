const crypto = require("crypto");
const { db } = require("../db");
const { VARIANT_AXIS } = require("../../core/productConstants");

function newId() {
  return `pvar_${crypto.randomBytes(6).toString("hex")}`;
}

function addVariant(productId, { sku, axis, value, ean, priceDelta, stock }) {
  if (!VARIANT_AXIS.includes(axis)) {
    throw new Error(`Invalid variant axis: ${axis}`);
  }
  const id = newId();
  db.prepare(`
    INSERT INTO pim_core_variants(id, product_id, sku, axis, value, ean, price_delta, stock)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, productId, sku, axis, value, ean || null, priceDelta || 0, stock || 0);
  return db.prepare("SELECT * FROM pim_core_variants WHERE id = ?").get(id);
}

function listVariants(productId) {
  return db.prepare("SELECT * FROM pim_core_variants WHERE product_id = ?").all(productId);
}

module.exports = { addVariant, listVariants, VARIANT_AXIS };
