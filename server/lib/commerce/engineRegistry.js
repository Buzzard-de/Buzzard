/**
 * 11 core commerce engines — registry and fail-closed live flags.
 * A SQLite table is not a live marketplace or payment rail.
 */
const ENGINES = Object.freeze([
  { id: "product", specialist: "category_ai", display: "Pelin Hanım", live: false, sales: false, covers: ["product"] },
  { id: "supplier", specialist: "stock_ai", display: "Çakır Bey", live: false, canBuy: false, covers: ["supplier"] },
  { id: "pricing", specialist: "pricing_ai", display: "Akın Bey", live: false, publishLive: false, covers: ["pricing"] },
  { id: "inventory", specialist: "stock_ai", display: "Çakır Bey", live: false, warehouse: false, covers: ["inventory"] },
  { id: "order", specialist: "pusat", display: "Pusat", live: false, covers: ["order"] },
  { id: "marketplace", specialist: "sales_analysis_ai", display: "Sencer Bey", live: false, oauth: false, covers: ["marketplace"] },
  { id: "returns", specialist: "banu_hanim", display: "Banu Hanım", live: false, covers: ["returns"] },
  { id: "customer", specialist: "banu_hanim", display: "Banu Hanım", live: false, covers: ["customer"] },
  { id: "market_country", specialist: "nedim_bey", display: "Nedim Bey", live: false, covers: ["market"] },
  { id: "payment", specialist: "nedim_bey", display: "Nedim Bey", live: false, realMoney: false, covers: ["payment", "financial_reconciliation"] },
  { id: "logistics", specialist: "tuncay_bey", display: "Tuncay Bey", live: false, liveCarrier: false, covers: ["fulfillment", "shipping"] },
]);

const COMMERCIAL_FLAGS = Object.freeze([
  "sales",
  "canBuy",
  "publishLive",
  "realMoney",
  "oauth",
  "liveCarrier",
  "warehouse",
]);

function elapsedMs(started) {
  return Math.round((Number(process.hrtime.bigint() - started) / 1e6) * 1000) / 1000;
}

function closedProbe(extra = {}) {
  return {
    id: null,
    callable: false,
    healthy: false,
    status: "FAILED",
    code: "PROBE_FAILED",
    live: false,
    purchased: false,
    orderCreated: false,
    paymentCreated: false,
    supplierPurchase: false,
    productionClaim: false,
    elapsedMs: 0,
    ...extra,
  };
}

function inspectEngine(engine) {
  const started = process.hrtime.bigint();
  try {
    if (!engine || typeof engine !== "object") return closedProbe({ code: "MISSING_ENGINE", elapsedMs: elapsedMs(started) });
    const id = typeof engine.id === "string" ? engine.id.trim() : "";
    if (!id) return closedProbe({ code: "MISSING_ENGINE", elapsedMs: elapsedMs(started) });
    const callable = typeof engine.specialist === "string" && engine.specialist.trim() !== "" && Array.isArray(engine.covers) && engine.covers.length > 0;
    if (!callable) return closedProbe({ id, code: "NOT_CALLABLE", elapsedMs: elapsedMs(started) });
    const commercial = engine.live === true || COMMERCIAL_FLAGS.some((flag) => engine[flag] === true);
    if (commercial || engine.live !== false) {
      return closedProbe({ id, callable: true, code: "COMMERCIAL_FLAG", elapsedMs: elapsedMs(started) });
    }
    return closedProbe({
      id,
      callable: true,
      healthy: true,
      status: "HEALTHY",
      code: "LOCAL_ONLY",
      elapsedMs: elapsedMs(started),
    });
  } catch {
    return closedProbe({ code: "PROBE_FAILED", elapsedMs: elapsedMs(started) });
  }
}

function recoverEngine(id) {
  const engine = ENGINES.find((row) => row.id === id);
  if (!engine) {
    return closedProbe({
      ok: false,
      recovered: false,
      code: "MISSING_ENGINE",
    });
  }
  const health = inspectEngine(engine);
  return {
    ok: health.healthy === true,
    recovered: health.healthy === true,
    id: engine.id,
    code: health.healthy ? "LOCAL_RECORD_RESTORED" : health.code,
    live: false,
    purchased: false,
    orderCreated: false,
    paymentCreated: false,
    supplierPurchase: false,
    productionClaim: false,
  };
}

function measureLocal() {
  const samples = 20;
  const started = process.hrtime.bigint();
  for (let i = 0; i < samples; i += 1) {
    for (const engine of ENGINES) inspectEngine(engine);
  }
  const elapsed = elapsedMs(started);
  const calls = samples * ENGINES.length;
  return {
    samples,
    engineCount: ENGINES.length,
    calls,
    elapsedMs: elapsed,
    perCallMs: Math.round((elapsed / calls) * 1000) / 1000,
    productionClaim: false,
    live: false,
  };
}

function snapshot() {
  const engines = ENGINES.map((engine) => {
    const health = inspectEngine(engine);
    return {
      ...engine,
      live: false,
      callable: health.callable === true,
      healthy: health.healthy === true,
      health: health.status,
      code: health.code,
      purchased: false,
      orderCreated: false,
      paymentCreated: false,
      supplierPurchase: false,
    };
  });
  const recovery = ENGINES.map((engine) => recoverEngine(engine.id));
  const healthyCount = engines.filter((engine) => engine.healthy === true).length;
  return {
    engines,
    count: ENGINES.length,
    callableCount: engines.filter((engine) => engine.callable === true).length,
    healthyCount,
    failedCount: engines.length - healthyCount,
    anyLive: false,
    salesEnabled: false,
    productionReady: false,
    productionClaim: false,
    recovery: {
      attempted: true,
      results: recovery,
      recoveredCount: recovery.filter((row) => row.recovered === true).length,
      failedCount: recovery.filter((row) => row.recovered !== true).length,
      productionClaim: false,
    },
    performance: measureLocal(),
  };
}

function buyStock() {
  return {
    ok: false,
    code: "HUMAN_GATE_REQUIRED",
    action: "STOCK_BUY",
    specialist: "stock_ai",
    purchased: false,
    virtualPurchase: false,
    stockChanged: false,
    orderCreated: false,
    paymentCreated: false,
    supplierPurchase: false,
    live: false,
  };
}

module.exports = { ENGINES, snapshot, buyStock, inspectEngine, recoverEngine };
