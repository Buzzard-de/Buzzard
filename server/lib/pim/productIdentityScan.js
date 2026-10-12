/**
 * Read-only identity scan across product stores.
 * Does not write, merge, activate SoT, or unlock sales.
 */

const fs = require("fs");
const path = require("path");

const STORE_QUERIES = Object.freeze([
  { store: "pim_core_products", sql: "SELECT sku, ean, gtin, title, price, status FROM pim_core_products" },
  { store: "pim30_products", sql: "SELECT sku, barcode AS ean, NULL AS gtin, NULL AS title, selling_price AS price, status FROM pim30_products" },
  { store: "pim_products", sql: "SELECT sku, ean, gtin, NULL AS title, price, status FROM pim_products" },
  { store: "products", sql: "SELECT sku, NULL AS ean, NULL AS gtin, name AS title, price_eur AS price, active AS status FROM products" },
]);

function readJsonCatalog() {
  const file = process.env.BUZZARD_PRODUCT_STORE_PATH || path.join(process.cwd(), "data", "buzzard_products.json");
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return (raw.products || []).map((row) => ({
      store: "data/buzzard_products.json",
      sku: String(row.sku || "").trim(),
      ean: row.ean || row.gtin || null,
      gtin: row.gtin || null,
      title: row.name || row.title || null,
      price: row.price ?? row.price_eur ?? null,
    }));
  } catch {
    return [];
  }
}

function rowsFromDb(db, spec) {
  if (!db) return [];
  try {
    return db.prepare(spec.sql).all().map((row) => ({
      store: spec.store,
      sku: String(row.sku || "").trim(),
      ean: row.ean || null,
      gtin: row.gtin || null,
      title: row.title || null,
      price: row.price == null ? null : Number(row.price),
      status: row.status == null ? null : String(row.status),
    }));
  } catch {
    return [];
  }
}

function duplicates(items, key) {
  const seen = new Map();
  const dupes = [];
  for (const item of items) {
    const value = String(item[key] || "").trim();
    if (!value) continue;
    const prev = seen.get(`${item.store}:${value}`);
    if (prev) dupes.push({ store: item.store, key, value });
    else seen.set(`${item.store}:${value}`, item);
  }
  return dupes;
}

function crossStoreSkus(items) {
  const bySku = new Map();
  for (const item of items) {
    if (!item.sku) continue;
    const list = bySku.get(item.sku) || [];
    if (!list.includes(item.store)) list.push(item.store);
    bySku.set(item.sku, list);
  }
  return [...bySku.entries()]
    .filter(([, stores]) => stores.length > 1)
    .map(([sku, stores]) => ({ sku, stores }));
}

function scanProductIdentity(db) {
  const items = STORE_QUERIES.flatMap((spec) => rowsFromDb(db, spec)).concat(readJsonCatalog());
  const withSku = items.filter((row) => row.sku);
  return {
    written: false,
    dualWrite: false,
    productSourceOfTruthActive: false,
    storesScanned: [...new Set(items.map((row) => row.store))],
    rowCount: withSku.length,
    missingSku: items.length - withSku.length,
    duplicateSkuInStore: duplicates(withSku, "sku"),
    duplicateEanInStore: duplicates(withSku, "ean"),
    skuInMultipleStores: crossStoreSkus(withSku),
    missingEan: withSku.filter((row) => !row.ean && !row.gtin).length,
    attributeConflicts: attributeConflicts(withSku),
    failClosed: true,
    merged: false,
    note: "Read-only scan. No store was selected or consolidated.",
  };
}

function attributeConflicts(items) {
  const bySku = new Map();
  for (const item of items) {
    if (!item.sku) continue;
    const list = bySku.get(item.sku) || [];
    list.push(item);
    bySku.set(item.sku, list);
  }
  const conflicts = [];
  for (const [sku, rows] of bySku) {
    if (rows.length < 2) continue;
    const eans = new Set(rows.map((row) => String(row.ean || row.gtin || "")).filter(Boolean));
    const prices = new Set(rows.map((row) => (row.price == null ? "" : String(row.price))).filter(Boolean));
    if (eans.size > 1 || prices.size > 1) {
      conflicts.push({
        sku,
        stores: [...new Set(rows.map((row) => row.store))],
        eanConflict: eans.size > 1,
        priceConflict: prices.size > 1,
      });
    }
  }
  return conflicts;
}

module.exports = { scanProductIdentity };
