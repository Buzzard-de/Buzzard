/**
 * Part 5 — Price sync pipeline with audit logging.
 */
const { getAdapter } = require("../supplier/adapterRegistry");
const { validatePrice } = require("./pipeline");
const { logAuditFromRequest } = require("../coreAudit");

const CRITICAL_PRICE_CHANGE_pct = 25;

async function runPipeline({ supplierId = "mock", dryRun = true, req = null } = {}) {
  const adapter = getAdapter(supplierId);
  const fetched = await adapter.fetchProducts();
  const products = Array.isArray(fetched) ? fetched : fetched.records || [];
  const changes = [];

  for (const raw of products) {
    const p = adapter.normalizeProduct(raw);
    const check = validatePrice(p.price);
    if (!check.ok) continue;

    const prevPrice = p.price;
    const newPrice = check.value;
    const deltaPct = prevPrice ? Math.abs((newPrice - prevPrice) / prevPrice) * 100 : 0;
    const critical = deltaPct >= CRITICAL_PRICE_CHANGE_pct;

    changes.push({
      sku: p.sku,
      previousPrice: prevPrice,
      newPrice,
      deltaPct: Math.round(deltaPct * 100) / 100,
      critical,
      requiresApproval: critical,
    });

    if (!dryRun && req) {
      logAuditFromRequest(req, {
        action: critical ? "price.change.critical" : "price.change",
        entityType: "product",
        entityId: p.sku,
        newValue: newPrice,
        metadata: { deltaPct, requiresApproval: critical },
      });
    }
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
    changes: 0,
    criticalChanges: 0,
    details: [],
    ignoredFixtureRows: changes.length,
    purchased: false,
    note: "A mock or unverified supplier price is not a commercial price",
  };
}

module.exports = { runPipeline, CRITICAL_PRICE_CHANGE_pct };
