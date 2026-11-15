const { check } = require("../permissionEngine");

function inspectFeeds({ actorId = "stock_ai", feeds = [] } = {}) {
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
  const available = rows.filter((r) => r.qty > 0 && !r.stale);
  const chosen = available.sort((a, b) => b.qty - a.qty)[0] || null;
  const sellable = Boolean(chosen);
  return {
    ok: true,
    dropshipOnly: true,
    buzzardWarehouse: false,
    sellable,
    chosen,
    stale: rows.filter((r) => r.stale),
    zero: rows.filter((r) => r.qty === 0),
    liveSupplierApi: false,
  };
}

function buyStock() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "STOCK_BUY", dropshipOnly: true };
}

function paySupplier() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "SUPPLIER_PAY" };
}

module.exports = { inspectFeeds, buyStock, paySupplier };
