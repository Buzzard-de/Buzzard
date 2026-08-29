/**
 * Part 5 — Category readiness real check framework.
 */
const { db } = require("./db");
const categoryVisibility = require("./categoryVisibility");
const { getAdapter } = require("./supplier/adapterRegistry");
const { CHECK_STATUS, READINESS_OVERALL } = require("../core/jobConstants");

function mapCheckToReadiness(status) {
  if (status === CHECK_STATUS.PASS) return "READY";
  if (status === CHECK_STATUS.FAIL) return "NOT_READY";
  if (status === CHECK_STATUS.WARNING) return "NOT_READY";
  return "NOT_READY";
}

function computeOverallFromChecks(checks) {
  const values = Object.values(checks);
  if (values.some((v) => v === CHECK_STATUS.FAIL)) return READINESS_OVERALL.NOT_READY;
  if (values.every((v) => v === CHECK_STATUS.PASS)) return READINESS_OVERALL.READY;
  if (values.some((v) => v === CHECK_STATUS.WARNING)) return READINESS_OVERALL.NOT_READY;
  return READINESS_OVERALL.NOT_READY;
}

function checkProducts(categoryId) {
  const count = db.prepare(`
    SELECT COUNT(*) n FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE LOWER(c.name) LIKE ? OR CAST(c.id AS TEXT) = ?
  `).get(`%${categoryId}%`, categoryId).n;
  if (count >= 5) return { status: CHECK_STATUS.PASS, detail: `${count} products` };
  if (count > 0) return { status: CHECK_STATUS.WARNING, detail: `${count} products (low)` };
  return { status: CHECK_STATUS.FAIL, detail: "No products" };
}

function checkPricing(categoryId) {
  const row = db.prepare(`
    SELECT COUNT(*) n, MIN(price_eur) min_p, MAX(price_eur) max_p FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE LOWER(c.name) LIKE ? OR CAST(c.id AS TEXT) = ?
  `).get(`%${categoryId}%`, categoryId);
  if (row.n > 0 && row.min_p > 0) return { status: CHECK_STATUS.PASS, detail: `€${row.min_p}-€${row.max_p}` };
  return { status: CHECK_STATUS.FAIL, detail: "No valid pricing" };
}

function checkStock(categoryId) {
  const row = db.prepare(`
    SELECT SUM(stock) total FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE LOWER(c.name) LIKE ? OR CAST(c.id AS TEXT) = ?
  `).get(`%${categoryId}%`, categoryId);
  if ((row.total || 0) > 0) return { status: CHECK_STATUS.PASS, detail: `stock=${row.total}` };
  return { status: CHECK_STATUS.WARNING, detail: "Zero stock" };
}

async function checkSupplier() {
  try {
    const adapter = getAdapter("mock");
    const health = await adapter.healthCheck();
    if (health.ok) return { status: CHECK_STATUS.PASS, detail: "Mock supplier OK" };
    return { status: CHECK_STATUS.FAIL, detail: health.error || "Supplier down" };
  } catch (err) {
    return { status: CHECK_STATUS.UNKNOWN, detail: err.message };
  }
}

function checkShipping() {
  if (process.env.BUZZARD_SALES_ENABLED === "1") {
    return { status: CHECK_STATUS.UNKNOWN, detail: "Shipping config not verified" };
  }
  return { status: CHECK_STATUS.WARNING, detail: "Sales disabled — shipping N/A" };
}

function checkFrontend(categoryId) {
  const vis = categoryVisibility.getCategoryStatus(categoryId);
  if (["ACTIVE", "COMING_SOON"].includes(vis.status)) {
    return { status: CHECK_STATUS.PASS, detail: vis.status };
  }
  return { status: CHECK_STATUS.WARNING, detail: vis.status };
}

function checkLegal() {
  return { status: CHECK_STATUS.WARNING, detail: "Legal content review pending" };
}

function checkContent(categoryId) {
  const count = db.prepare(`
    SELECT COUNT(*) n FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE (p.description IS NOT NULL AND p.description != '')
    AND (LOWER(c.name) LIKE ? OR CAST(c.id AS TEXT) = ?)
  `).get(`%${categoryId}%`, categoryId).n;
  if (count >= 3) return { status: CHECK_STATUS.PASS, detail: `${count} with description` };
  return { status: CHECK_STATUS.WARNING, detail: "Insufficient content" };
}

async function runChecksForCategory(categoryId) {
  const supplier = await checkSupplier();
  const checks = {
    products: checkProducts(categoryId),
    pricing: checkPricing(categoryId),
    stock: checkStock(categoryId),
    supplier,
    shipping: checkShipping(),
    frontend: checkFrontend(categoryId),
    legal: checkLegal(),
    content: checkContent(categoryId),
  };

  const overall = computeOverallFromChecks(
    Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v.status]))
  );

  const readiness = Object.fromEntries(
    Object.entries(checks).map(([k, v]) => [k, mapCheckToReadiness(v.status)])
  );
  readiness.overall = overall;

  return {
    categoryId,
    checks,
    overall,
    readiness,
    canActivateForSale:
      overall === READINESS_OVERALL.READY &&
      process.env.BUZZARD_SALES_ENABLED === "1" &&
      categoryVisibility.canActivateForSale(readiness, categoryVisibility.getCategoryStatus(categoryId).status),
    salesEnabled: process.env.BUZZARD_SALES_ENABLED === "1",
  };
}

module.exports = {
  runChecksForCategory,
  computeOverallFromChecks,
  mapCheckToReadiness,
  CHECK_STATUS,
};
