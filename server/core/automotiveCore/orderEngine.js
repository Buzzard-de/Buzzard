/**
 * Automotive Core — order abstraction (LIVE blocked by default).
 */
const ORDER_STATES = Object.freeze([
  "PENDING", "VALIDATING", "READY_FOR_SUPPLIER", "SUPPLIER_SUBMITTED", "SUPPLIER_CONFIRMED",
  "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED", "MANUAL_REVIEW",
]);

function isOrderLiveEnabled() {
  return (
    process.env.ORDER_LIVE_ENABLED === "1" &&
    process.env.BUZZARD_SALES_ENABLED === "1" &&
    process.env.REAL_SUPPLIER_LIVE_IMPORT === "1"
  );
}

function createOrder(order = {}) {
  if (!isOrderLiveEnabled()) {
    return {
      ok: false,
      blocked: true,
      errorKey: "AUTOMOTIVE_LIVE_DISABLED",
      state: "MANUAL_REVIEW",
      reason: "ORDER_LIVE_ENABLED=0",
    };
  }
  return { ok: false, blocked: true, errorKey: "AUTOMOTIVE_LIVE_DISABLED", state: "MANUAL_REVIEW" };
}

function submitSupplierOrder(order = {}) {
  return createOrder(order);
}

function scoreSupplierSelection(candidates = [], context = {}) {
  return candidates
    .map((c) => ({
      supplierId: c.id,
      score:
        (c.stockAvailable ? 30 : 0) +
        (c.priceScore || 0) * 20 +
        (c.deliveryScore || 0) * 15 +
        (c.fitmentConfidence || 0) * 20 +
        (c.reliability || 0) * 15,
      liveSubmissionAllowed: false,
      context,
    }))
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  ORDER_STATES,
  isOrderLiveEnabled,
  createOrder,
  submitSupplierOrder,
  scoreSupplierSelection,
};
