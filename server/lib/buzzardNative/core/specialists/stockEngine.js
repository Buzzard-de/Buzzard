const { check } = require("../permissionEngine");
const { selectSupplier } = require("../../../supplier/offerValidation");

function inspectFeeds({ actorId = "stock_ai", feeds = [], customerOrderVerified = false, destination } = {}) {
  if (!check(actorId, "STOCK_READ").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const now = Date.now();
  const rows = feeds.map((f) => {
    const qty = Number(f.qty);
    const ageH = f.updatedAt ? (now - f.updatedAt) / 36e5 : Infinity;
    const reportedQty = Number.isFinite(qty) ? qty : null;
    return {
      supplier: f.supplier,
      sku: f.sku,
      qty: null,
      reportedQty,
      stale: ageH > 24,
      format: f.format || "unknown",
      verified: false,
    };
  });
  const selection = selectSupplier({ feeds, customerOrderVerified, destination });
  return {
    ok: false,
    live: false,
    mock: feeds.some((f) => f && f.mock === true),
    status: "BLOCKED_EXTERNAL",
    code: customerOrderVerified === true ? "LIVE_CONNECTION_ABSENT" : "ORDER_UNVERIFIED",
    dropshipOnly: true,
    buzzardWarehouse: false,
    sellable: false,
    chosen: null,
    purchased: false,
    reserved: false,
    stale: rows.filter((r) => r.stale || r.reportedQty == null),
    zero: rows.filter((r) => r.reportedQty === 0),
    missing: rows.filter((r) => r.reportedQty == null),
    liveSupplierApi: false,
    commercialEligibility: "BLOCKED",
    candidates: selection.candidates,
  };
}

function buyStock(input = {}) {
  const orderVerified = input.customerOrderVerified === true;
  return {
    ok: false,
    code: orderVerified ? "LIVE_CONNECTION_ABSENT" : "HUMAN_GATE_REQUIRED",
    reason: orderVerified ? "SUPPLIER_NOT_LIVE" : "ORDER_UNVERIFIED",
    action: "STOCK_BUY",
    dropshipOnly: true,
    purchased: false,
    reserved: false,
    customerOrderVerified: orderVerified,
  };
}

function paySupplier() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "SUPPLIER_PAY" };
}

module.exports = { inspectFeeds, buyStock, paySupplier, selectSupplier };
