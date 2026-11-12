const { check } = require("../permissionEngine");

function inspectFeeds({ actorId = "stock_ai", feeds = [], customerOrderVerified = false } = {}) {
  if (!check(actorId, "STOCK_READ").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const now = Date.now();
  const rows = feeds.map((f) => {
    const qty = Number(f.qty);
    const ageH = f.updatedAt ? (now - f.updatedAt) / 36e5 : Infinity;
    return {
      supplier: f.supplier,
      sku: f.sku,
      qty: Number.isFinite(qty) ? qty : null,
      stale: ageH > 24,
      format: f.format || "unknown",
    };
  });
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
    stale: rows.filter((r) => r.stale || r.qty == null),
    zero: rows.filter((r) => r.qty === 0),
    missing: rows.filter((r) => r.qty == null),
    liveSupplierApi: false,
    commercialEligibility: "BLOCKED",
  };
}

function buyStock() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "STOCK_BUY", dropshipOnly: true };
}

function paySupplier() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "SUPPLIER_PAY" };
}

module.exports = { inspectFeeds, buyStock, paySupplier };
