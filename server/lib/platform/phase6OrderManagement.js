const { finalizePhase } = require("./phaseGateFinalize");
const { ORDER_STATUS, canTransitionOrder } = require("../../core/commerceConstants");
const {
  runDryOrderPipeline,
  cancelOrderDry,
  dryReserveStock,
  listTrackedOrders,
} = require("../commerce/orderManagementOrchestrator");
const { SAMPLE } = require("./phase4SupplierAutomation");
const fs = require("fs");
const path = require("path");

function ordersPluginHasDryRehearsalRoute() {
  try {
    const src = fs.readFileSync(path.join(__dirname, "../../plugins/ordersPlugin.js"), "utf8");
    return src.includes("/api/orders/dry-rehearsal") && src.includes("rehearseOrderFromCheckout");
  } catch {
    return false;
  }
}

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
  const cancelled = trackedId ? cancelOrderDry(trackedId) : { ok: false, code: "MISSING_ORDER_ID" };
  const missingCancel = cancelOrderDry("");
  const unknownCancel = cancelOrderDry("missing-order");
  const transition = canTransitionOrder(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED);
  const reserveFail = dryReserveStock({ sku: "X", quantity: 99, available: 1 });

  const checks = [
    { id: "ORD_LIFECYCLE", ok: pipe.ok === true && pipe.supplierForward?.live === false },
    { id: "ORD_VALIDATE", ok: pipe.validation?.ok === true },
    { id: "ORD_RESERVE", ok: pipe.reserve?.ok === true && reserveFail.ok === false },
    {
      id: "ORD_CANCEL_RULE",
      ok: transition === true && Boolean(trackedId) && cancelled.ok === true && missingCancel.ok === false && unknownCancel.ok === false,
    },
    { id: "ORD_SUPPLIER_FORWARD", ok: pipe.supplierForward?.ok === true && pipe.supplierForward.live === false },
    { id: "ORD_ALT_SUPPLIER", ok: pipe.selection?.lines?.[0]?.fallback != null },
    { id: "ORD_CENTRAL_TRACK", ok: pipe.trackerSize >= 1 },
    { id: "ORD_RECOVERY", ok: pipe.recovery?.retry === true },
    {
      id: "ORD_HTTP_DRY_REHEARSAL",
      ok: ordersPluginHasDryRehearsalRoute(),
      note: "Route presence only. phase6DryRehearsalRoute.test.mjs calls POST /api/orders/dry-rehearsal and expects 200 with live false",
    },
    { id: "ORD_LIVE_SUBMIT", ok: false, status: "BLOCKED_EXTERNAL", note: "supplierOrdersBlocked + SALES locked" },
  ];

  return {
    ...finalizePhase(6, "Sipariş yönetimi", checks, ["ORD_LIVE_SUBMIT"]),
    evidence: {
      ok: pipe.ok === true && pipe.supplierForward?.live === false && reserveFail.ok === false,
      tracked: Boolean(trackedId),
      cancelled: cancelled.ok === true,
      missingCancel: missingCancel.code,
      unknownCancel: unknownCancel.code,
    },
  };
}

module.exports = { evaluatePhase6OrderManagement };