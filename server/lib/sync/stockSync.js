/**
 * Part 5 — Stock sync pipeline.
 */
const { getAdapter } = require("../supplier/adapterRegistry");
const { validateStock } = require("./pipeline");
const { appendJobLog } = require("../jobObservability");

async function runPipeline({ supplierId = "mock", jobId, dryRun = true } = {}) {
  const adapter = getAdapter(supplierId);
  const fetched = await adapter.fetchProducts();
  const products = Array.isArray(fetched) ? fetched : fetched.records || [];
  const updates = [];

  for (const raw of products) {
    const p = adapter.normalizeProduct(raw);
    const check = validateStock(p.stock);
    if (!check.ok) continue;
    updates.push({
      sku: p.sku,
      quantity: null,
      fixtureQuantity: check.value,
      availability: "UNKNOWN",
      supplierId,
      commercialUse: false,
      syncStatus: "BLOCKED_EXTERNAL",
    });
  }

  if (jobId) {
    appendJobLog(jobId, `Stock sync blocked: ${updates.length} fixture rows ignored`, {
      metadata: { supplierId, dryRun, status: "BLOCKED_EXTERNAL" },
    });
  }

  return {
    ok: false,
    live: false,
    mock: fetched.mock === true,
    status: fetched.status || "BLOCKED_EXTERNAL",
    code: fetched.code,
    commercialEligibility: "BLOCKED",
    supplierId,
    dryRun,
    updated: 0,
    items: [],
    ignoredFixtureRows: updates.length,
    purchased: false,
  };
}

module.exports = { runPipeline };
