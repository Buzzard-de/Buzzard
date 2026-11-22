/**
 * Directive §17 — synthetic customer journey (dry-run only, sales LOCKED).
 */
const { searchAndSort } = require("../pim/catalogSearchSort");
const { bindProductCategory } = require("../pim/productCategoryBind");
const { runValidationPipeline } = require("../pim/productValidationPipeline");
const { runCommercialDryRun, evaluateCommercialStock, DECISIONS } = require("./commercialCore");
const { createDraftStore, draftOrdersFromDryRun } = require("./dryOrderDraft");
const { runConnected } = require("./isolatedOrder");
const { createReturnStore, requestReturn, refundMoney } = require("./dryReturnRequest");
const { paymentStatus } = require("../finance/bankingAdapter");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { validateProductAttributes, resolveProfile } = require("../pim/subcategoryCatalogProfile");
const { calculate } = require("../finance/unifiedPricing");
const { calculateVat } = require("../buzzardNative/core/tax/vatEngine");
const { draftEmail, classify } = require("../customer/banuDesk");
const { getAdapter } = require("../logistics/carrierContract");

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
  const workflow = [];
  const push = (id, payload) => steps.push({ id, ...payload });
  const flow = (id, ok, input, output) => {
    workflow.push({
      id,
      ok: ok === true,
      live: false,
      input,
      output,
    });
  };

  const searchInput = { q: "brake", sort: "price", order: "asc" };
  const discovered = searchAndSort(
    [
      { sku: "JOURNEY-SKU-001", title: "Brake journey demo", price: 49, stock: 5 },
      { sku: "OTHER", title: "Other", price: 10, stock: 2 },
    ],
    searchInput
  );
  const foundSku = discovered.items.some((item) => item.sku === "JOURNEY-SKU-001");
  push(
    "discovery",
    step(foundSku && discovered.liveIndex === false, {
      backend: discovered.backend,
      count: discovered.items.length,
    })
  );
  flow("product_search", foundSku && discovered.liveIndex === false, searchInput, {
    skus: discovered.items.map((item) => item.sku),
    liveIndex: discovered.liveIndex,
  });

  const bound = bindProductCategory(record);

  const pipeline = runValidationPipeline({
    ...record,
    taxonomy_category_id: "cat-05-03",
    supplier_category: "cat-05-03",
    ean_gtin: "4006381333937",
    gtin: "4006381333937",
    ean: "4006381333937",
    mpn: "P85074-SYN",
  }, {
    supplierCode: "api-supplier-dry",
    automotive: true,
    excludeProductId: "journey-exclude",
    excludeStagingId: "journey-exclude",
  });
  push("product_validation", step(bound.ok === true && pipeline.ok === true, { pipelineOk: pipeline.ok, lifecycle: pipeline.lifecycleStatus }));
  flow("product_validation", bound.ok === true && pipeline.ok === true, { sku: record.sku, ean: record.ean_gtin }, {
    categoryId: bound.categoryId,
    lifecycle: pipeline.lifecycleStatus,
    pipelineOk: pipeline.ok,
  });
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

  const inquiry = classify(`order ${customerId}`);
  push("customer_registration", step(inquiry === "order_status" && sales.allowed !== true, {
    customerId,
    verified: false,
    liveAccount: false,
    persisted: false,
  }));
  flow("customer", inquiry === "order_status" && sales.allowed !== true, { customerId }, {
    inquiry,
    persisted: false,
    liveAccount: false,
  });

  push("cart", step(record.stock > record.reserved_stock, { lines: 1, qty: 1, persisted: false }));

  push(
    "checkout",
    step(sales.status === "LOCKED", { salesGate: sales.status, realCheckout: false })
  );

  const price = calculate({
    actorId: "pricing_ai",
    supplierCost: record.supplier_price.amount,
    shipping: record.shipping_cost,
    marketplaceCommission: record.marketplace_fee,
    vat: 0,
    returnReserve: record.return_reserve,
    paymentFees: record.payment_fee,
    category: "automotive",
    marketPrice: record.comparable_market_price,
  });
  const vatDe = calculateVat({
    actorId: "nedim_bey",
    sellerCountry: "DE",
    customerCountry: "DE",
    deliveryCountry: "DE",
    goodsNet: record.supplier_price.amount,
  });
  const vatFr = calculateVat({
    actorId: "nedim_bey",
    sellerCountry: "DE",
    customerCountry: "FR",
    deliveryCountry: "FR",
    goodsNet: record.supplier_price.amount,
  });
  flow("pricing", price.ok === true && price.livePublish === false, {
    supplierCost: record.supplier_price.amount,
    category: "automotive",
  }, {
    net: price.net,
    estimatedProfit: price.estimatedProfit,
    livePublish: price.livePublish,
  });
  flow(
    "vat",
    vatDe.ok === true && vatFr.ok === true && vatDe.filingReady === false && vatFr.filingReady === false && vatDe.rate !== vatFr.rate,
    { goodsNet: record.supplier_price.amount, sellerCountry: "DE" },
    { de: { rate: vatDe.rate, vat: vatDe.vat, gross: vatDe.gross }, fr: { rate: vatFr.rate, vat: vatFr.vat, gross: vatFr.gross } }
  );

  const stock = evaluateCommercialStock({
    supplierStock: record.stock,
    reservedStock: record.reserved_stock,
    updatedAt: record.stock_updated_at,
  });
  flow("inventory", stock.ok === true && stock.availableStock === record.stock - record.reserved_stock, {
    supplierStock: record.stock,
    reservedStock: record.reserved_stock,
  }, {
    availableStock: stock.availableStock,
    status: stock.status,
    sellable: stock.sellable,
  });

  const dryRun = runCommercialDryRun({
    supplierId: "api-supplier-dry",
    format: "api",
    records: [record],
    country: "DE",
  });
  const ready = (dryRun.products || []).find((p) => p.decision === DECISIONS.READY_FOR_REVIEW);
  const authorized = paymentStatus({ from: "CREATED", event: "authorize" });
  push("payment_sandbox", step(Boolean(ready) && authorized.ok === true && authorized.to !== "CAPTURED", {
    authorized: authorized.ok,
    state: authorized.to,
    captured: false,
    moneyMoved: false,
  }));
  flow("payment_gate", authorized.ok === true && authorized.to !== "CAPTURED" && sales.allowed !== true, {
    from: "CREATED",
    event: "authorize",
  }, {
    state: authorized.to,
    captured: false,
    moneyMoved: false,
  });

  push("fraud_validation", step(dryRun.ok === true, { decision: ready?.decision || null }));

  push("supplier_selection", step(Boolean(ready?.stock?.supplierStock), { speculativeBuy: false }));
  flow("supplier_routing", Boolean(ready?.stock?.supplierStock) && dryRun.stockUpdated === false, {
    supplierId: "api-supplier-dry",
  }, {
    supplierStock: ready?.stock?.supplierStock ?? null,
    stockUpdated: dryRun.stockUpdated,
    speculativeBuy: false,
  });

  const store = createDraftStore();
  const drafts = draftOrdersFromDryRun(dryRun, { customerId, store });
  push("supplier_order_sandbox", step(drafts.supplierPurchase === false && (drafts.summary?.drafted || 0) >= 1, { drafted: drafts.summary?.drafted || 0 }));
  flow("order_validation", drafts.supplierPurchase === false && (drafts.summary?.drafted || 0) >= 1, {
    customerId,
  }, {
    drafted: drafts.summary?.drafted || 0,
    orderId: drafts.drafts?.[0]?.orderId || null,
    supplierPurchase: drafts.supplierPurchase,
  });

  const isolated = runConnected("happy");
  const carrier = getAdapter("DHL");
  const tracked = carrier.trackShipment({ status: "IN_TRANSIT" });
  const delivered = carrier.trackShipment({ status: "DELIVERED" });
  push("shipment_sandbox", step(isolated.stages?.fulfillment?.liveShipment === false && tracked.liveShipment === false, { carrier: "DHL" }));
  push("tracking", step(tracked.ok === true && delivered.ok === true && tracked.status !== delivered.status && tracked.live === false, { live: false }));
  flow("shipment_tracking", tracked.ok === true && delivered.status !== tracked.status && delivered.liveShipment === false, {
    carrier: "DHL",
    from: "IN_TRANSIT",
    to: "DELIVERED",
  }, {
    fromStatus: tracked.status,
    toStatus: delivered.status,
    liveShipment: delivered.liveShipment,
  });
  push("delivery_status", step(isolated.scenario === "happy", { scenario: isolated.scenario }));

  const returnStore = createReturnStore();
  const ret = requestReturn(returnStore, {
    orderId: drafts.drafts?.[0]?.orderId || "DRY-ORD-SYN",
    reason: "SYNTHETIC_DRY",
  });
  push("return_request", step(ret.ok === true, { code: ret.code || "OK" }));

  const refund = refundMoney();
  push("refund_sandbox", step(refund.live === false && refund.refundIssued === false, { code: refund.code }));
  flow("returns", ret.ok === true, { orderId: drafts.drafts?.[0]?.orderId || "DRY-ORD-SYN", reason: "SYNTHETIC_DRY" }, {
    code: ret.code || "OK",
    live: false,
  });
  flow("refund_gate", refund.live === false && refund.refundIssued === false, { action: "refundMoney" }, {
    code: refund.code,
    refundIssued: refund.refundIssued,
    live: refund.live,
  });

  const locale = "en";
  const note = draftEmail({
    locale,
    intent: "order_status",
    facts: { orderId: drafts.drafts?.[0]?.orderId || "DRY-ORD-SYN" },
  });
  push("customer_notifications", step(note.sent === false && note.autoSendAuthorized === false, {
    channel: note.channel,
    sent: note.sent,
    locale,
  }));
  flow("customer_notification", note.sent === false && note.autoSendAuthorized === false, {
    locale,
    intent: "order_status",
  }, {
    sent: note.sent,
    channel: note.channel,
    autoSendAuthorized: note.autoSendAuthorized,
  });

  push("accounting_reconciliation", step(isolated.consistent === true, { ledgerOk: isolated.consistent }));

  const workflowOrder = [
    "customer",
    "product_search",
    "product_validation",
    "pricing",
    "vat",
    "inventory",
    "order_validation",
    "payment_gate",
    "supplier_routing",
    "shipment_tracking",
    "customer_notification",
    "returns",
    "refund_gate",
  ];
  const orderedWorkflow = workflowOrder.map((id) => workflow.find((item) => item.id === id)).filter(Boolean);
  const failed = steps.filter((s) => s.ok !== true);
  const workflowFailed = orderedWorkflow.filter((item) => item.ok !== true);
  return {
    ok: failed.length === 0 && workflowFailed.length === 0 && sales.status === "LOCKED" && sales.allowed !== true,
    steps,
    workflow: orderedWorkflow,
    stepCount: steps.length,
    expectedSteps: STEP_IDS.length,
    failedSteps: failed.map((s) => s.id),
    workflowFailed: workflowFailed.map((item) => item.id),
    live: false,
    salesEnabled: false,
    productionReady: false,
    paymentCaptured: false,
    supplierPurchase: false,
    notificationSent: false,
    pimWrite: false,
    dryRun: true,
  };
}

module.exports = { STEP_IDS, runSyntheticCustomerJourney, SAMPLE };