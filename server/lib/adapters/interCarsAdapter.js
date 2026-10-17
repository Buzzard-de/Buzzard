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

function lookupArticle(query = {}) {
  const q = String(query.q || query.sku || "").trim();
  return {
    ok: true,
    mock: true,
    live: false,
    httpAttempted: false,
    query: q,
    records: [],
    ...describeStatus(),
  };
}

function purchaseOrder() {
  return {
    ok: false,
    sent: false,
    live: false,
    purchased: false,
    httpAttempted: false,
    amountCharged: 0,
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
  purchaseOrder,
};
