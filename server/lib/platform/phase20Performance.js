const { searchAndSort } = require("../pim/catalogSearchSort");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase20Performance() {
  const items = Array.from({ length: 2000 }, (_, i) => ({
    sku: `SKU-${i}`,
    title: `Product ${i % 50}`,
    price: (i % 100) + 1,
    stock: i % 20,
  }));
  const t0 = Date.now();
  const sorted = searchAndSort(items, { q: "product", sort: "price", order: "asc" });
  const ms = Date.now() - t0;

  const checks = [
    { id: "PERF_SEARCH_SORT", ok: sorted.items.length > 0 && ms < 500 },
    { id: "PERF_NO_LIVE_INDEX", ok: sorted.liveIndex === false },
    { id: "PERF_LOAD_TEST", ok: false, status: "BLOCKED_EXTERNAL", note: "External load harness" },
  ];

  return finalizePhase(20, "Performans ve dayanıklılık", checks, ["PERF_LOAD_TEST"]);
}

module.exports = { evaluatePhase20Performance };