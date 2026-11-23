/**
 * Read-only facade over engines that already exist.
 * It does not queue work, decide approvals, or enable sales.
 */
function status() {
  const { isSalesEnabled } = require("../salesMode");
  const product = require("../productSot").getStatus();
  return {
    role: "facade",
    orchestrator: false,
    decides: false,
    salesEnabled: isSalesEnabled(),
    productionReady: false,
    product: { target: product.target, active: product.active === true },
    engines: ["productCore", "orderService", "pricing", "supplier", "market"],
  };
}

function traceCommerce(input = {}) {
  const { isSalesEnabled } = require("../salesMode");
  const { quotePrice, applyPriceChange } = require("../commerce/pricingIntegration");
  const { inspectFeeds, buyStock } = require("../buzzardNative/core/specialists/stockEngine");
  const { capturePayment } = require("../commerce/paymentService");
  const { isSupplierOrdersBlocked } = require("../supplier/supplierSafetyGate");
  const { calculateShipping } = require("../commerce/shippingProvider");
  const { getStandardVat } = require("../commerce/ab27Tax");
  const { createConnector, listConnectors } = require("../marketplace/marketplaceConnectorRegistry");
  const { phase3Identity } = require("../commerce/phase3Identity");
  const { InterCarsAdapter } = require("../adapters/interCarsAdapter");
  const { startReturn } = require("../logistics/v5/returnsEngine");
  const { withIdempotency } = require("../commerce/idempotency");
  const { getOrderHistoryReadiness } = require("../customer/customerOrderBridge");

  const price = quotePrice({
    supplierCost: input.supplierCost ?? 10,
    shippingCost: 0,
    vatRate: 0.19,
    currency: "EUR",
  });
  const priceWrite = applyPriceChange({ actorType: "AI", amount: price.recommendedPrice, actorId: "software-facade" });
  const stock = inspectFeeds({
    actorId: "stock_ai",
    feeds: [{ supplier: "sandbox", sku: "DRY-CHAIN", qty: "n/a", updatedAt: Date.now() }],
  });
  const identity = phase3Identity(input.orderId || "dry-chain", {
    amount: price.recommendedPrice,
    currency: price.currency,
  });
  const payment = capturePayment({ actorId: "software-facade" });
  const shipping = calculateShipping({ country: "DE", subtotal: price.recommendedPrice, itemCount: 1 });
  const listings = listConnectors().map((row) => {
    const decision = createConnector(row.id).publishDecision({ sku: "DRY-CHAIN", title: "Dry chain" });
    return { id: row.id, live: decision.live === true, ok: decision.ok === true };
  });
  const idempotencyKey = input.idempotencyKey || "software-facade-dry";
  const first = withIdempotency({
    key: idempotencyKey,
    scope: "software_facade",
    payload: { amount: price.recommendedPrice },
    handler: () => ({ ok: true, orderCreated: false, live: false, amount: price.recommendedPrice }),
  });
  const conflict = withIdempotency({
    key: idempotencyKey,
    scope: "software_facade",
    payload: { amount: price.recommendedPrice + 1 },
    handler: () => ({ ok: true, orderCreated: true }),
  });
  const claim = startReturn({ shipmentId: "DRY-CHAIN" });
  const history = getOrderHistoryReadiness();

  return {
    orchestrator: false,
    decides: false,
    salesEnabled: isSalesEnabled(),
    productionReady: false,
    price: {
      recommendationOnly: price.recommendationOnly === true,
      currency: price.currency,
      amount: price.recommendedPrice,
    },
    priceWrite: { ok: priceWrite.ok === true, code: priceWrite.code },
    stock: { sellable: stock.sellable === true, liveSupplierApi: stock.liveSupplierApi === true },
    stockBuy: buyStock(),
    identity,
    payment: { code: payment.code, realMoneyMovement: payment.realMoneyMovement === true },
    amountMatchesIdentity: identity.amount === price.recommendedPrice,
    shipping: { dryRun: shipping.dryRun === true, shipmentCreated: shipping.shipmentCreated === true, currency: shipping.currency },
    vat: { country: "DE", rate: getStandardVat("DE") },
    supplier: { blocked: isSupplierOrdersBlocked(), order: new InterCarsAdapter().placeOrder() },
    listings,
    idempotency: { firstOrderCreated: first.orderCreated === true, conflict: conflict.code },
    returns: {
      customerRefundIssued: claim.customerRefundIssued === true,
      supplierRefundReceived: claim.supplierRefundReceived === true,
      labelIssued: claim.labelIssued === true,
    },
    customer: { realOrdersEnabled: history.realOrdersEnabled === true },
  };
}

module.exports = { status, traceCommerce };
