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

function snapshot() {
  return {
    engines: ENGINES.map((e) => ({ ...e })),
    count: ENGINES.length,
    anyLive: false,
    salesEnabled: false,
    productionReady: false,
  };
}

function buyStock() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "STOCK_BUY", specialist: "stock_ai" };
}

module.exports = { ENGINES, snapshot, buyStock };
