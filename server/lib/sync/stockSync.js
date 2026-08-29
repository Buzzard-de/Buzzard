/**
 * Part 5 — Stock sync pipeline.
 */
const { getAdapter } = require("../supplier/adapterRegistry");
const { validateStock } = require("./pipeline");
const { appendJobLog } = require("../jobObservability");

async function runPipeline({ supplierId = "mock", jobId, dryRun = true } = {}) {
  const adapter = getAdapter(supplierId);
  const products = await adapter.fetchProducts();
  const updates = [];

  for (const raw of products) {
    const p = adapter.normalizeProduct(raw);
    const check = validateStock(p.stock);
    if (!check.ok) continue;
    updates.push({
      sku: p.sku,
      quantity: check.value,
      availability: p.availability,
      supplierId,
      lastUpdate: new Date().toISOString(),
      syncStatus: dryRun ? "simulated" : "pending",
    });
  }

  if (jobId) {
    appendJobLog(jobId, `Stock sync: ${updates.length} items`, {
      metadata: { supplierId, dryRun },
    });
  }

  return {
    supplierId,
    dryRun,
    updated: dryRun ? 0 : updates.length,
    items: updates,
  };
}

module.exports = { runPipeline };
