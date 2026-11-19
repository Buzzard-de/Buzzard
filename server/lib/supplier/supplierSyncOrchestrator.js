/**
 * Dry-run supplier price/stock sync (no live import, no PIM write).
 */
const { importSupplierFeed } = require("./supplierImportPipeline");
const { applyPriceStockUpdate } = require("../priceStockQueue");
const { evaluateSupplierHealth } = require("./supplierHealth");

function drySyncSupplierFeed({ supplierId, format = "api", records = [] } = {}) {
  const imported = importSupplierFeed({ supplierId, format, records });
  const priceStock = [];
  for (const row of records) {
    const applied = applyPriceStockUpdate({
      jobId: `dry-${supplierId}-${row.sku || row.supplier_sku || "x"}`,
      supplierPrice: row.supplier_price || { amount: row.price, currency: "EUR" },
      stock: row.stock,
      previous: { supplier_price: row.previous_price || { amount: row.supplier_price?.amount } },
      supplier: { id: supplierId },
    });
    priceStock.push({
      sku: row.sku || row.supplier_sku,
      ok: applied.ok,
      dryRun: true,
      anomaly: applied.anomaly,
      applied: applied.applied === true,
    });
  }
  const health = evaluateSupplierHealth(supplierId || "api-supplier-dry");
  return {
    ok: imported.catalog?.length >= 0,
    supplierId,
    liveImport: false,
    catalogAccepted: imported.catalog?.length || 0,
    rejected: imported.rejected?.length || 0,
    duplicates: imported.duplicates?.length || 0,
    priceStock,
    health: { overall: health.overall, canConnectLive: false },
  };
}

module.exports = { drySyncSupplierFeed };