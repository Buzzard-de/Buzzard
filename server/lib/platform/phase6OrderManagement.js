const { ORDER_STATUS, canTransitionOrder } = require("../../core/commerceConstants");
const {
  runDryOrderPipeline,
  cancelOrderDry,
  dryReserveStock,
  listTrackedOrders,
} = require("../commerce/orderManagementOrchestrator");
const { SAMPLE } = require("./phase4SupplierAutomation");

const RECORD = {
  sku: "DRY-SKU-001",
  supplier_sku: "DRY-SKU-001",
  name: "Bremsbelag Set Vorderachse",
  title: "Bremsbelag Set Vorderachse",
  description: "Synthetic dry-run brake pad set for catalog review.",
  supplier_category: "automotive/bremssystem",
  ean_gtin: "5901234123457",
  mpn: "P85073",
  brand: "ATE",
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
  supplier_price: { amount: 40, currency: "EUR" },
  shipping_cost: 6,
  marketplace_fee: 4,
  payment_fee: 1.2,
  return_reserve: 1,
  other_cost: 0,
  comparable_market_price: 90,
  stock: 12,
  reserved_stock: 2,
  stock_updated_at: new Date().toISOString(),
  country: "DE",
};

function evaluatePhase6OrderManagement() {
  const pipe = runDryOrderPipeline(RECORD);
  const tracked = listTrackedOrders();
  const trackedId = tracked[0]?.orderId;
  const cancelled = trackedId ? cancelOrderDry(trackedId) : { ok: false };
  const transition = canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED);
  const reserveFail = dryReserveStock({ sku: "X", quantity: 99, available: 1 });

  const checks = [
    { id: "ORD_LIFECYCLE", ok: pipe.ok === true },
    { id: "ORD_VALIDATE", ok: pipe.validation?.ok === true },
    { id: "ORD_RESERVE", ok: pipe.reserve?.ok === true && reserveFail.ok === false },
    { id: "ORD_CANCEL_RULE", ok: transition === true && (trackedId ? cancelled.ok === true : true) },
    { id: "ORD_SUPPLIER_FORWARD", ok: pipe.supplierForward?.ok === true && pipe.supplierForward.live === false },
    { id: "ORD_ALT_SUPPLIER", ok: pipe.selection?.lines?.[0]?.fallback != null },
    { id: "ORD_CENTRAL_TRACK", ok: pipe.trackerSize >= 1 },
    { id: "ORD_RECOVERY", ok: pipe.recovery?.retry === true },
    { id: "ORD_LIVE_SUBMIT", ok: false, status: "BLOCKED_EXTERNAL", note: "supplierOrdersBlocked + SALES locked" },
  ];

  const software = checks.filter((c) => c.id !== "ORD_LIVE_SUBMIT");
  const passed = software.filter((c) => c.ok).length;

  return {
    phase: 6,
    title: "Sipariş yönetimi",
    ok: passed === software.length,
    percentComplete: Math.round((passed / software.length) * 1000) / 10,
    passed,
    total: software.length,
    checks,
    live: false,
    completeClaim: passed === software.length,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { evaluatePhase6OrderManagement };