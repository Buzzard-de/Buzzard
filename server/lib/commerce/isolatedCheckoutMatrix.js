/**
 * Isolated 11-engine fixture. Mock workflow ≠ live commerce.
 */
const { snapshot: engines, buyStock } = require("./engineRegistry");
const { calculate, applyCustomerRefund } = require("../finance/unifiedPricing");
const { screen } = require("../compliance/sanctionsAdapter");
const { createShipment, track } = require("../logistics/carrierAdapter");
const { reply, refund } = require("../buzzardNative/core/specialists/banuEngine");
const { split } = require("../finance/taxReserves");
const { initiateTransfer } = require("../finance/bankingAdapter");

function runMatrix({
  supplierCost = 40,
  shipping = 6,
  marketplaceCommission = 4,
  vat = 10,
  returnReserve = 1,
  paymentFees = 1.2,
  category = "automotive",
  country = "FR",
} = {}) {
  const registry = engines();
  const sanctions = screen({ origin: "DE", destination: country, product: "pad", endUser: "retail" });
  const price = calculate({
    actorId: "pricing_ai",
    supplierCost,
    shipping,
    marketplaceCommission,
    vat,
    returnReserve,
    paymentFees,
    category,
  });
  const stockBuy = buyStock();
  const shipment = createShipment();
  const tracking = track();
  const inquiry = reply({
    actorId: "banu_hanim",
    intent: "order_status",
    verifiedFacts: { orderId: "SYN-1", answer: "cancelled_fixture" },
    locale: "de",
  });
  const refundGate = refund();
  const afterRefund = applyCustomerRefund({ estimatedProfit: price.estimatedProfit || 0, refund: 2 });
  const tax = split({ netProfit: afterRefund.actualProfit || 0, taxEstimate: 1, country });
  const pay = initiateTransfer();

  return {
    live: false,
    productionReady: false,
    sales: false,
    engines: registry.count,
    dropshipping: stockBuy.code === "HUMAN_GATE_REQUIRED",
    sanctionsHold: sanctions.hold === true && sanctions.clear === false,
    priceOk: price.ok === true && price.net >= 0.5,
    shipmentLive: shipment.liveShipment === false,
    trackingLive: tracking.ok === false,
    inquirySent: inquiry.sent === false,
    refundLive: refundGate.ok === false,
    paymentSent: Boolean(pay.sent),
    supplierReimbursementAssumed: afterRefund.supplierReimbursementAssumed === false,
    germanyMixed: tax.germanySeparate === (country === "DE"),
    steps: [
      "discover",
      "compare_supplier",
      "stock",
      "price",
      "profit",
      "order_sim",
      "select_supplier",
      "fulfill_sim",
      "track_sim",
      "return_sim",
      "refund_accounting",
      "recon",
    ],
  };
}

module.exports = { runMatrix };
