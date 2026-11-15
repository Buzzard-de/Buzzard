/**
 * Part 17 — Stock status engine (no invented supplier stock).
 */
const STOCK_STATUS = Object.freeze({
  IN_STOCK: "IN_STOCK",
  LOW_STOCK: "LOW_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  UNKNOWN: "UNKNOWN",
  BLOCKED: "BLOCKED",
});

function classifyQuantity(quantity, { lowThreshold = 5, safetyStock = 0 } = {}) {
  if (quantity == null || quantity === "") {
    return { status: STOCK_STATUS.UNKNOWN, quantity: null, blocked: false };
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty)) {
    return { status: STOCK_STATUS.BLOCKED, quantity: null, blocked: true, reason: "INVALID_STOCK" };
  }
  if (qty < 0) {
    return { status: STOCK_STATUS.BLOCKED, quantity: qty, blocked: true, reason: "NEGATIVE_STOCK" };
  }
  if (qty === 0) {
    return { status: STOCK_STATUS.OUT_OF_STOCK, quantity: 0, blocked: false };
  }
  const effective = qty - (Number(safetyStock) || 0);
  if (effective <= 0) {
    return { status: STOCK_STATUS.OUT_OF_STOCK, quantity: qty, blocked: false, reason: "SAFETY_STOCK" };
  }
  if (effective <= lowThreshold) {
    return { status: STOCK_STATUS.LOW_STOCK, quantity: qty, blocked: false };
  }
  return { status: STOCK_STATUS.IN_STOCK, quantity: qty, blocked: false };
}

function deriveStockStatus(quantity, options) {
  const reported = classifyQuantity(quantity, options);
  return {
    status: STOCK_STATUS.UNKNOWN,
    reportedStatus: reported.status,
    quantity: null,
    reportedQuantity: reported.quantity,
    blocked: reported.blocked === true,
    reason: reported.reason || "STOCK_UNVERIFIED",
    stockVerified: false,
    purchasable: false,
    sellable: false,
  };
}

function evaluateStockRecord(record = {}, options = {}) {
  const reported = deriveStockStatus(record.stock ?? record.quantity, options);
  return {
    status: STOCK_STATUS.UNKNOWN,
    quantity: null,
    reportedQuantity: reported.reportedQuantity,
    blocked: true,
    reason: record.mock === true ? "MOCK_NOT_COMMERCIAL" : reported.reportedStatus === "UNKNOWN" ? "MISSING_STOCK" : "SUPPLIER_STOCK_UNVERIFIED",
    ok: false,
    live: false,
    mock: record.mock === true,
    sellable: false,
    commercialEligibility: "BLOCKED",
    source: record.source || "unverified",
    lastSupplierUpdate: record.lastSupplierUpdate || record.supplier_updated_at || null,
    stockUpdatedAt: record.stockUpdatedAt || record.stock_updated_at || null,
  };
}

module.exports = {
  STOCK_STATUS,
  deriveStockStatus,
  evaluateStockRecord,
};
