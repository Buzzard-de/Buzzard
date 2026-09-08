/**
 * Automotive Core — stock model (never fake availability).
 */
const STATUSES = Object.freeze(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "ON_ORDER", "PREORDER", "UNKNOWN"]);

function normalizeStock(raw = {}) {
  const supplierStock = Number(raw.supplierStock ?? raw.quantity ?? NaN);
  const hasKnownStock = Number.isFinite(supplierStock);
  const availableStock = hasKnownStock ? Math.max(0, supplierStock - Number(raw.reservedStock || 0)) : null;

  let availabilityStatus = "UNKNOWN";
  if (hasKnownStock) {
    if (availableStock <= 0) availabilityStatus = "OUT_OF_STOCK";
    else if (availableStock <= Number(raw.lowStockThreshold || 5)) availabilityStatus = "LOW_STOCK";
    else availabilityStatus = "IN_STOCK";
  }

  return {
    supplierStock: hasKnownStock ? supplierStock : null,
    availableStock,
    reservedStock: Number(raw.reservedStock || 0),
    incomingStock: Number(raw.incomingStock || 0),
    leadTime: raw.leadTime || null,
    availabilityStatus,
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
    source: raw.source || "unknown",
    displayAllowed: availabilityStatus !== "UNKNOWN",
  };
}

function validateStock(stock = {}) {
  const normalized = normalizeStock(stock);
  if (normalized.availabilityStatus === "UNKNOWN") {
    return { valid: false, status: "REVIEW_REQUIRED", errorKey: "AUTOMOTIVE_STOCK_UNKNOWN", stock: normalized };
  }
  return { valid: true, status: "PASS", stock: normalized };
}

module.exports = {
  STATUSES,
  normalizeStock,
  validateStock,
};
