/**
 * Directive §17 — synthetic customer journey (dry-run only, sales LOCKED).
 */
const { searchAndSort } = require("../pim/catalogSearchSort");
const { bindProductCategory } = require("../pim/productCategoryBind");
const { runValidationPipeline } = require("../pim/productValidationPipeline");
const { runCommercialDryRun, DECISIONS } = require("./commercialCore");
const { createDraftStore, draftOrdersFromDryRun } = require("./dryOrderDraft");
const { runConnected } = require("./isolatedOrder");
const { createReturnStore, requestReturn, refundMoney } = require("./dryReturnRequest");
const { paymentStatus } = require("../finance/bankingAdapter");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { validateProductAttributes, resolveProfile } = require("../pim/subcategoryCatalogProfile");

const SAMPLE = Object.freeze({
  sku: "JOURNEY-SKU-001",
  supplier_sku: "JOURNEY-SKU-001",
  name: "Bremsbelag Set Vorderachse",
  title: "Bremsbelag Set Vorderachse",
  description: "Synthetic journey brake pad set for dry-run integration.",
  ean_gtin: "5901234123457",
  mpn: "P85074",
  brand: "ATE",
  supplier_category: "automotive/bremssystem",
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
  images: ["https://cdn.test-supplier.example.de/p85073.jpg"],
});

const STEP_IDS = Object.freeze([
  "discovery",
  "product_validation",
  "product_display",
  "customer_registration",
  "cart",
  "checkout",
  "payment_sandbox",
  "fraud_validation",
  "supplier_selection",
  "supplier_order_sandbox",
  "shipment_sandbox",
  "tracking",
  "delivery_status",
  "return_request",
  "refund_sandbox",
  "customer_notifications",
  "accounting_reconciliation",
]);

function step(ok, extra = {}) {
  return { ok: ok === true, live: false, salesEnabled: false, productionReady: false, ...extra };
}

function runSyntheticCustomerJourney({ record = SAMPLE, customerId = "SYN-JOURNEY-CUST" } = {}) {
  const sales = evaluateSalesGate();
  const steps = [];
  const push = (id, payload) => steps.push({ id, ...payload });

  const discovered = searchAndSort(
    [
      { sku: "JOURNEY-SKU-001", title: "Brake journey demo", price: 49, stock: 5 },
      { sku: "OTHER", title: "Other", price: 10, stock: 2 },
    ],
    { q: "brake", sort: "price", order: "asc" }
  );
  push(
    "discovery",
    step(discovered.items.length > 0 && discovered.liveIndex === false, {
      backend: discovered.backend,
      count: discovered.items.length,
    })
  );

  const bound = bindProductCategory(record);

  const pipeline = runValidationPipeline(record, {
    supplierCode: "api-supplier-dry",
    automotive: true,
    excludeProductId: "journey-exclude",
    excludeStagingId: "journey-exclude",
  });
  push("product_validation", step(bound.ok === true, { pipelineOk: pipeline.ok, lifecycle: pipeline.lifecycleStatus }));
  const profile = resolveProfile({ subcategoryId: bound.subcategoryId, rootSlug: "automotive" });
  const attrCheck = validateProductAttributes({ attributes: { position: "front" } }, profile);
  push(
    "product_display",
    step(bound.ok && bound.categoryId === "cat-05", {
      categoryId: bound.categoryId,
      subcategoryId: bound.subcategoryId,
      attributeCheck: attrCheck.code,
    })
  );

  push("customer_registration", step(true, { customerId, verified: false, liveAccount: false }));

  push("cart", step(true, { lines: 1, qty: 1, persisted: false }));

  push(
    "checkout",
    step(sales.status === "LOCKED", { salesGate: sales.status, realCheckout: false })
  );

  const dryRun = runCommercialDryRun({
    supplierId: "api-supplier-dry",
    format: "api",
    records: [record],
    country: "DE",
  });
  const ready = (dryRun.products || []).find((p) => p.decision === DECISIONS.READY_FOR_REVIEW);
  push("payment_sandbox", step(Boolean(ready), {
    authorized: paymentStatus({ from: "CREATED", event: "authorize" }).ok,
    captured: false,
    moneyMoved: false,
  }));

  push("fraud_validation", step(dryRun.ok === true, { decision: ready?.decision || null }));

  push("supplier_selection", step(Boolean(ready?.stock?.supplierStock), { speculativeBuy: false }));

  const store = createDraftStore();
  const drafts = draftOrdersFromDryRun(dryRun, { customerId, store });
  push("supplier_order_sandbox", step(drafts.supplierPurchase === false, { drafted: drafts.summary?.drafted || 0 }));

  const isolated = runConnected("happy");
  push("shipment_sandbox", step(isolated.stages?.fulfillment?.liveShipment === false, { carrier: "DHL" }));
  push("tracking", step(Boolean(isolated.stages?.tracking), { live: false }));
  push("delivery_status", step(isolated.scenario === "happy", { scenario: isolated.scenario }));

  const returnStore = createReturnStore();
  const ret = requestReturn(returnStore, {
    orderId: drafts.drafts?.[0]?.orderId || "DRY-ORD-SYN",
    reason: "SYNTHETIC_DRY",
  });
  push("return_request", step(ret.ok === true, { code: ret.code || "OK" }));

  const refund = refundMoney();
  push("refund_sandbox", step(refund.live === false && refund.refundIssued === false, { code: refund.code }));

  push("customer_notifications", step(true, { channel: "draft_only", sent: false }));

  push("accounting_reconciliation", step(isolated.consistent === true, { ledgerOk: isolated.consistent }));

  const failed = steps.filter((s) => s.ok !== true);
  return {
    ok: failed.length === 0 && sales.status === "LOCKED",
    steps,
    stepCount: steps.length,
    expectedSteps: STEP_IDS.length,
    failedSteps: failed.map((s) => s.id),
    live: false,
    salesEnabled: false,
    productionReady: false,
    paymentCaptured: false,
    supplierPurchase: false,
    pimWrite: false,
    dryRun: true,
  };
}

module.exports = { STEP_IDS, runSyntheticCustomerJourney, SAMPLE };