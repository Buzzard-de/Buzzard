const { db } = require("../db");

function findDuplicate(field, value, excludeId) {
  if (!value) return null;
  const col = field === "sku" ? "sku" : field;
  let row = db.prepare(`SELECT id, sku FROM pim_core_products WHERE ${col} = ?`).get(value);
  if (row && excludeId && row.id === excludeId) return null;
  return row;
}

function assertUnique({ sku, ean, gtin, mpn, excludeId }) {
  for (const [field, val] of [
    ["sku", sku],
    ["ean", ean],
    ["gtin", gtin],
    ["mpn", mpn],
  ]) {
    const dup = findDuplicate(field, val, excludeId);
    if (dup) {
      const err = new Error(`Duplicate ${field.toUpperCase()}: ${val} (existing: ${dup.sku})`);
      err.code = `duplicate_${field}`;
      throw err;
    }
  }
}

function checkIdentifiers({ sku, ean, gtin, mpn, excludeId }) {
  const issues = [];
  for (const [field, val] of [
    ["sku", sku],
    ["ean", ean],
    ["gtin", gtin],
    ["mpn", mpn],
  ]) {
    if (!val) continue;
    const dup = findDuplicate(field, val, excludeId);
    if (dup) issues.push({ field, value: val, existingSku: dup.sku });
  }
  return issues;
}

module.exports = { findDuplicate, assertUnique, checkIdentifiers };
