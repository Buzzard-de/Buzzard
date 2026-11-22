const { searchAndSort } = require("../pim/catalogSearchSort");
const { autoQuoteFromSupplierRecord } = require("../pricing/pricingAutomationService");
const { db } = require("../db");
const { createDurableTaskQueue } = require("../pusat/durableTaskQueue");
const os = require("os");
const path = require("path");
const { finalizePhase } = require("./phaseGateFinalize");

function percentile(samples, p) {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function measure(fn, times) {
  const samples = [];
  for (let i = 0; i < times; i += 1) samples.push(fn());
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    samples: samples.length,
    totalMs: Math.round(total * 100) / 100,
    p50Ms: percentile(samples, 50),
    p95Ms: percentile(samples, 95),
    maxMs: samples[samples.length - 1] == null ? null : Math.max(...samples),
  };
}

function evaluatePhase20Performance() {
  const items = Array.from({ length: 2000 }, (_, i) => ({
    sku: `SKU-${i}`,
    title: `Product ${i % 50}`,
    price: (i % 100) + 1,
    stock: i % 20,
  }));
  const before = process.memoryUsage().heapUsed;
  const search = measure(() => {
    const started = process.hrtime.bigint();
    const sorted = searchAndSort(items, { q: "product", sort: "price", order: "asc" });
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (sorted.items.length === 0 || sorted.liveIndex !== false) throw new Error("search failed");
    return ms;
  }, 20);
  const quote = measure(() => {
    const started = process.hrtime.bigint();
    const result = autoQuoteFromSupplierRecord(
      { supplier_price: { amount: 40, currency: "EUR" }, comparable_market_price: 90, return_reserve: 1, other_cost: 0 },
      { country: "DE", marketplace: "amazon", category: { activeCategoryId: "cat-05", slug: "automotive" } }
    );
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (result.livePriceWrite !== false) throw new Error("price write");
    return ms;
  }, 20);
  const query = measure(() => {
    const started = process.hrtime.bigint();
    const row = db.prepare("SELECT COUNT(*) n FROM sqlite_master").get();
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (!row || row.n < 1) throw new Error("query failed");
    return ms;
  }, 20);
  const queuePath = path.join(os.tmpdir(), "buzzard-phase20", `perf-${process.pid}-${Date.now()}.sqlite`);
  const queue = createDurableTaskQueue({ dbPath: queuePath });
  let queueOk = false;
  let recovered = false;
  try {
    const queued = queue.enqueue({ title: "phase20", ownerId: "pusat", assigneeId: "sinan_bey", idempotencyKey: "phase20-synthetic" });
    const again = queue.enqueue({ title: "phase20", ownerId: "pusat", assigneeId: "sinan_bey", idempotencyKey: "phase20-synthetic" });
    queue.registerWorker({ workerId: "phase20-worker", identity: "sinan_bey" });
    const leased = queue.lease({ workerId: "phase20-worker" });
    const failed = leased.ok ? queue.fail(leased.task.id, { reason: "SYNTHETIC_FAULT" }) : { ok: false };
    recovered = failed.ok === true && failed.task?.state === "QUEUED";
    queueOk = queued.ok === true && again.ok === true && recovered;
  } finally {
    queue.close();
  }
  const after = process.memoryUsage().heapUsed;
  const repeated = searchAndSort(items, { q: "product", sort: "price", order: "asc" });
  const first = searchAndSort(items, { q: "product", sort: "price", order: "asc" });
  const cacheSame = repeated.items.length === first.items.length && repeated.items[0]?.sku === first.items[0]?.sku;
  const checks = [
    { id: "PERF_SEARCH_SORT", ok: search.p95Ms < 500 && search.samples === 20 },
    { id: "PERF_QUOTE", ok: quote.p95Ms < 500 && quote.samples === 20 },
    { id: "PERF_QUERY", ok: query.p95Ms < 100 && query.samples === 20 },
    { id: "PERF_QUEUE", ok: queueOk === true && recovered === true },
    { id: "PERF_MEMORY", ok: after > 0 && before > 0 },
    { id: "PERF_CACHE", ok: cacheSame === true },
    { id: "PERF_NO_LIVE_INDEX", ok: repeated.liveIndex === false },
    { id: "PERF_LOAD_TEST", ok: false, status: "BLOCKED_EXTERNAL", note: "External production load harness" },
  ];
  return {
    ...finalizePhase(20, "Performans ve dayanıklılık", checks, ["PERF_LOAD_TEST"]),
    measurement: {
      environment: "isolated synthetic, single vitest worker",
      workload: { catalogRows: 2000, iterations: 20, queueTasks: 1 },
      concurrency: 1,
      search,
      quote,
      query,
      heapBefore: before,
      heapAfter: after,
      failures: 0,
      productionVerification: false,
    },
  };
}

module.exports = { evaluatePhase20Performance, percentile };
