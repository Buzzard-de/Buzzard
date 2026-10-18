/**
 * Inter-Cars local adapter class.
 * Never opens HTTP. Key presence is not a live order.
 */

function describeStatus() {
  return {
    id: "inter_cars",
    name: "Inter-Cars Mock Adapter",
    mock: true,
    live: false,
    liveVerified: false,
    httpAttempted: false,
    purchaseOrderSent: false,
    keyPresent: Boolean(process.env.INTERCARS_API_KEY),
    blocked: "BLOCKED_EXTERNAL_DEPENDENCY",
    note: "INTERCARS_API_KEY / INTERCARS_API_URL presence is not live stock or PO. This adapter never opens HTTP.",
  };
}

const AI_ACTORS = new Set(["pusat", "guardian", "orchestrator", "esat", "agent", "ai"]);

function lookupArticle(query = {}) {
  const q = String(query.q || query.sku || "").trim();
  return {
    ok: true,
    mock: true,
    live: false,
    httpAttempted: false,
    query: q,
    records: [],
    inStock: false,
    inventedStock: false,
    vendorStockIgnored: query.vendorStock != null || query.liveStock != null,
    ...describeStatus(),
  };
}

function confirmAvailability() {
  return {
    ok: false,
    live: false,
    mock: true,
    inStock: false,
    inventedStock: false,
    httpAttempted: false,
    reason: "LIVE_STOCK_UNKNOWN",
    ...describeStatus(),
  };
}

function purchaseOrder(input = {}) {
  const actor = String(input.actor || input.approver || "").trim().toLowerCase();
  if (input.vendorPoId || input.purchaseOrderId) {
    return {
      ok: false,
      sent: false,
      live: false,
      purchased: false,
      httpAttempted: false,
      amountCharged: 0,
      inventedPoId: false,
      purchaseOrderId: null,
      reason: "VENDOR_PO_ID_REJECTED",
      ...describeStatus(),
      purchaseOrderSent: false,
    };
  }
  if (AI_ACTORS.has(actor)) {
    return {
      ok: false,
      sent: false,
      live: false,
      purchased: false,
      httpAttempted: false,
      amountCharged: 0,
      inventedPoId: false,
      purchaseOrderId: null,
      reason: "SELF_APPROVE_DENIED",
      actor,
      ...describeStatus(),
      purchaseOrderSent: false,
    };
  }
  return {
    ok: false,
    sent: false,
    live: false,
    purchased: false,
    httpAttempted: false,
    amountCharged: 0,
    inventedPoId: false,
    purchaseOrderId: null,
    forcePurchaseIgnored: input.forcePurchase === true,
    reason: "LIVE_PO_BLOCKED",
    ...describeStatus(),
    purchaseOrderSent: false,
  };
}

module.exports = {
  name: "Inter-Cars Mock Adapter",
  mock: true,
  live: false,
  describeStatus,
  lookupArticle,
  confirmAvailability,
  purchaseOrder,
};
