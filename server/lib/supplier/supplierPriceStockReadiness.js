/**
 * Part 23 — Supplier price and stock readiness validation (no estimation).
 */
const { SUPPLIER_READINESS_STATUS } = require("../../core/supplierIntegrationConstants");

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function validatePrice(price, currency = "EUR") {
  const findings = [];

  if (price === null || price === undefined || price === "") {
    findings.push({ code: "PRICE_MISSING", status: SUPPLIER_READINESS_STATUS.BLOCKED, field: "price" });
    return { ok: false, findings, status: SUPPLIER_READINESS_STATUS.BLOCKED };
  }

  const amount = Number(price);
  if (!Number.isFinite(amount)) {
    findings.push({ code: "PRICE_INVALID", status: SUPPLIER_READINESS_STATUS.BLOCKED, field: "price" });
    return { ok: false, findings, status: SUPPLIER_READINESS_STATUS.BLOCKED };
  }

  if (amount < 0) {
    findings.push({ code: "PRICE_NEGATIVE", status: SUPPLIER_READINESS_STATUS.BLOCKED, field: "price" });
    return { ok: false, findings, status: SUPPLIER_READINESS_STATUS.BLOCKED };
  }

  if (amount === 0) {
    findings.push({ code: "PRICE_ZERO", status: SUPPLIER_READINESS_STATUS.CONDITION, field: "price" });
  }

  const cur = String(currency || "").trim().toUpperCase();
  if (!cur || cur.length !== 3) {
    findings.push({ code: "CURRENCY_INVALID", status: SUPPLIER_READINESS_STATUS.CONDITION, field: "currency" });
  }

  const blocked = findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.BLOCKED);
  return {
    ok: !blocked,
    amount,
    currency: cur || "EUR",
    findings,
    status: blocked ? SUPPLIER_READINESS_STATUS.BLOCKED : SUPPLIER_READINESS_STATUS.PASS,
  };
}

function validateStock(stock, { allowNegative = false } = {}) {
  const findings = [];

  if (stock === null || stock === undefined || stock === "") {
    findings.push({ code: "STOCK_MISSING", status: SUPPLIER_READINESS_STATUS.CONDITION, field: "stock" });
    return { ok: false, findings, status: SUPPLIER_READINESS_STATUS.CONDITION };
  }

  const qty = Number(stock);
  if (!Number.isFinite(qty)) {
    findings.push({ code: "STOCK_INVALID", status: SUPPLIER_READINESS_STATUS.BLOCKED, field: "stock" });
    return { ok: false, findings, status: SUPPLIER_READINESS_STATUS.BLOCKED };
  }

  if (qty < 0 && !allowNegative) {
    findings.push({ code: "STOCK_NEGATIVE", status: SUPPLIER_READINESS_STATUS.BLOCKED, field: "stock" });
    return { ok: false, findings, status: SUPPLIER_READINESS_STATUS.BLOCKED };
  }

  if (qty === 0) {
    findings.push({ code: "STOCK_ZERO", status: SUPPLIER_READINESS_STATUS.CONDITION, field: "stock" });
  }

  const blocked = findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.BLOCKED);
  return {
    ok: !blocked,
    quantity: qty,
    findings,
    status: blocked ? SUPPLIER_READINESS_STATUS.BLOCKED : SUPPLIER_READINESS_STATUS.PASS,
  };
}

function checkStaleData(updatedAt, thresholdMs = STALE_THRESHOLD_MS) {
  if (!updatedAt) {
    return { stale: true, status: SUPPLIER_READINESS_STATUS.CONDITION, code: "TIMESTAMP_MISSING" };
  }
  const ts = new Date(updatedAt).getTime();
  if (!Number.isFinite(ts)) {
    return { stale: true, status: SUPPLIER_READINESS_STATUS.CONDITION, code: "TIMESTAMP_INVALID" };
  }
  const ageMs = Date.now() - ts;
  if (ageMs > thresholdMs) {
    return { stale: true, status: SUPPLIER_READINESS_STATUS.CONDITION, code: "DATA_STALE", ageMs };
  }
  return { stale: false, status: SUPPLIER_READINESS_STATUS.PASS, ageMs };
}

function evaluatePriceStockReadiness(record, { updatedAt = null } = {}) {
  const price = validatePrice(
    record.supplier_price?.amount ?? record.price ?? record.sourcePrice,
    record.supplier_price?.currency || record.currency
  );
  const stock = validateStock(record.stock ?? record.sourceStock);
  const stale = checkStaleData(updatedAt || record.updatedAt);

  const blocked =
    price.status === SUPPLIER_READINESS_STATUS.BLOCKED ||
    stock.status === SUPPLIER_READINESS_STATUS.BLOCKED;

  return {
    ok: !blocked,
    status: blocked
      ? SUPPLIER_READINESS_STATUS.BLOCKED
      : stale.stale || price.findings.some((f) => f.status === SUPPLIER_READINESS_STATUS.CONDITION)
        ? SUPPLIER_READINESS_STATUS.CONDITION
        : SUPPLIER_READINESS_STATUS.PASS,
    price,
    stock,
    stale,
  };
}

module.exports = {
  validatePrice,
  validateStock,
  checkStaleData,
  evaluatePriceStockReadiness,
  STALE_THRESHOLD_MS,
};
