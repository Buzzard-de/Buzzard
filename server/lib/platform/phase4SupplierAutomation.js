/**
 * Phase 4 — Supplier integrations & stock automation (software scope; live #20 BLOCKED_EXTERNAL).
 */
const { ApiSupplierAdapter } = require("../supplier/apiSupplierAdapter");
const { XmlSupplierAdapter } = require("../supplier/xmlSupplierAdapter");
const { CsvSupplierAdapter } = require("../supplier/csvSupplierAdapter");
const { listSuppliers, selectAdapterForFormat } = require("../supplier/supplierRegistry");
const { importSupplierFeed } = require("../supplier/supplierImportPipeline");
const { mapActiveCatalogCategory } = require("../supplier/supplierMappingService");
const { drySyncSupplierFeed } = require("../supplier/supplierSyncOrchestrator");
const { selectSupplierForOrder, rankSupplierOffers } = require("../supplier/supplierSelectionEngine");
const { validateOrderPayload } = require("../supplier/supplierOrderReadiness");
const { evaluateSupplierHealth } = require("../supplier/supplierHealth");
const { planSupplierRecovery } = require("../supplier/supplierErrorRecovery");
const { buyStock } = require("../commerce/engineRegistry");

const SAMPLE = {
  sku: "DRY-SKU-001",
  supplier_sku: "DRY-SKU-001",
  supplier_category: "automotive/bremssystem",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  title: "Brake pad set",
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
  supplier_price: { amount: 40, currency: "EUR" },
  stock: 8,
};

function selectionAccepted(picked) {
  if (picked?.ok !== true) return false;
  const fallbackId = picked.fallback?.supplierId || picked.lines?.[0]?.fallback?.supplierId;
  return fallbackId === "xml-supplier-dry";
}

function evaluatePhase4SupplierAutomation() {
  const api = new ApiSupplierAdapter();
  const xml = new XmlSupplierAdapter();
  const csv = new CsvSupplierAdapter();
  const suppliers = listSuppliers();
  const mapping = mapActiveCatalogCategory("automotive/brakes");
  const imported = importSupplierFeed({ supplierId: "api-supplier-dry", format: "api", records: [SAMPLE] });
  const sync = drySyncSupplierFeed({ supplierId: "api-supplier-dry", format: "api", records: [SAMPLE] });
  const ranked = rankSupplierOffers([
    { supplierId: "api-supplier-dry", unitCost: 40, stock: 8, reliabilityScore: 0.9 },
    { supplierId: "xml-supplier-dry", unitCost: 42, stock: 3, reliabilityScore: 0.8 },
  ]);
  const picked = selectSupplierForOrder({
    lineItems: [{ sku: "DRY-SKU-001", quantity: 1 }],
    offersBySku: {
      "DRY-SKU-001": [
        { supplierId: "api-supplier-dry", unitCost: 40, stock: 8 },
        { supplierId: "xml-supplier-dry", unitCost: 42, stock: 3 },
      ],
    },
  });
  const orderPayload = {
    supplierId: "api-supplier-dry",
    orderId: "DRY-ORD-PHASE4",
    items: [{ supplierSku: "DRY-SKU-001", quantity: 1 }],
  };
  const orderValidation = validateOrderPayload(orderPayload);
  const order = {
    ok: orderValidation.ok,
    readiness: {
      ok: orderValidation.ok,
      dryRun: true,
      createOrderBlocked: orderValidation.createOrderBlocked,
    },
    submit: { ok: false, code: "ORDERS_DISABLED", live: false },
    live: false,
  };
  const health = evaluateSupplierHealth("api-supplier-dry");
  const recovery = planSupplierRecovery({ code: "networkBlocked" }, { attempt: 1 });
  const stockBuy = buyStock();

  const checks = [
    { id: "SUP_API_DRY", ok: api.networkBlocked === true && api.validateConfiguration().dryRun === true },
    { id: "SUP_XML_DRY", ok: xml.networkBlocked === true },
    { id: "SUP_CSV_DRY", ok: csv.networkBlocked === true },
    { id: "SUP_REGISTRY", ok: suppliers.length >= 4 },
    { id: "SUP_FORMAT_SELECT", ok: selectAdapterForFormat("api").id === "api-supplier-dry" },
    { id: "SUP_MAPPING", ok: mapping.ok === true && Boolean(mapping.categoryId) },
    { id: "SUP_IMPORT", ok: imported.catalog.length >= 1 },
    { id: "SUP_PRICE_STOCK_SYNC", ok: sync.ok && sync.liveImport === false && sync.priceStock.length >= 1 },
    { id: "SUP_SELECTION", ok: selectionAccepted(picked) },
    { id: "SUP_ORDER_DRY", ok: order.ok === true && order.live === false && order.submit?.live !== true },
    { id: "SUP_PERFORMANCE", ok: health.ok && health.canConnectLive === false },
    { id: "SUP_RECOVERY", ok: recovery.retry === true },
    { id: "SUP_NO_PREBUY", ok: stockBuy.ok === false },
    {
      id: "SUP_LIVE_API",
      ok: false,
      status: "BLOCKED_EXTERNAL",
      note: "Dev-list #20 — REAL_SUPPLIER credentials + explicit live import flag",
    },
  ];

  const softwareChecks = checks.filter((c) => c.id !== "SUP_LIVE_API");
  const passed = softwareChecks.filter((c) => c.ok).length;
  const total = softwareChecks.length;
  const percent = Math.round((passed / total) * 1000) / 10;

  return {
    phase: 4,
    title: "Tedarikçi entegrasyonları ve stok otomasyonu",
    ok: passed === total,
    percentComplete: percent,
    passed,
    total,
    checks,
    liveBlocked: ["SUP_LIVE_API"],
    completeClaim: false,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { evaluatePhase4SupplierAutomation, selectionAccepted, SAMPLE };