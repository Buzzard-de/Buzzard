/**
 * Part 7 — Sync status between PIM Core and storefront cache
 */
const { db } = require("../db");
const { SYNC_STATUS } = require("../../core/storefrontConstants");
const catalogCache = require("./catalogCache");

function ensureTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pim_core_storefront_sync (
      product_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'PENDING',
      last_synced_at TEXT,
      pim_updated_at TEXT,
      error_message TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

ensureTable();

function markSynced(productId, pimUpdatedAt) {
  db.prepare(`
    INSERT INTO pim_core_storefront_sync(product_id, status, last_synced_at, pim_updated_at, error_message, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?, NULL, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id) DO UPDATE SET
      status = excluded.status,
      last_synced_at = CURRENT_TIMESTAMP,
      pim_updated_at = excluded.pim_updated_at,
      error_message = NULL,
      updated_at = CURRENT_TIMESTAMP
  `).run(productId, SYNC_STATUS.SYNCED, pimUpdatedAt || null);
}

function markStale(productId) {
  db.prepare(`
    INSERT INTO pim_core_storefront_sync(product_id, status, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id) DO UPDATE SET status = ?, updated_at = CURRENT_TIMESTAMP
  `).run(productId, SYNC_STATUS.STALE, SYNC_STATUS.STALE);
}

function markError(productId, message) {
  db.prepare(`
    INSERT INTO pim_core_storefront_sync(product_id, status, error_message, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id) DO UPDATE SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP
  `).run(productId, SYNC_STATUS.ERROR, message, SYNC_STATUS.ERROR, message);
}

function getSummary() {
  const rows = db.prepare(`
    SELECT status, COUNT(*) n FROM pim_core_storefront_sync GROUP BY status
  `).all();
  const counts = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  return {
    synced: counts[SYNC_STATUS.SYNCED] || 0,
    pending: counts[SYNC_STATUS.PENDING] || 0,
    stale: counts[SYNC_STATUS.STALE] || 0,
    error: counts[SYNC_STATUS.ERROR] || 0,
    total: rows.reduce((s, r) => s + r.n, 0),
  };
}

function runSync({ dryRun = true } = {}) {
  const productCore = require("../pim/productCore");
  const { mapPimToStorefront } = require("./publicProductMapper");
  const { isProductVisibleOnStorefront } = require("./storefrontVisibility");

  const products = productCore.listProducts({ limit: 500 });
  let synced = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      if (!isProductVisibleOnStorefront(p)) {
        skipped += 1;
        continue;
      }
      if (!dryRun) {
        mapPimToStorefront(p);
        markSynced(p.id, p.updatedAt);
      }
      synced += 1;
    } catch (err) {
      markError(p.id, err.message);
    }
  }

  if (!dryRun) {
    catalogCache.invalidate("catalog|");
  }

  return { dryRun, synced, skipped, summary: getSummary() };
}

module.exports = {
  markSynced,
  markStale,
  markError,
  getSummary,
  runSync,
  SYNC_STATUS,
};
