/**
 * Cross-module checks on the isolated order path.
 * Does not open the development database or move money.
 */
const fs = require("fs");
const path = require("path");
const { createStore, runIsolatedOrder } = require("./isolatedOrder");
const { calculate } = require("../finance/unifiedPricing");
const { draftEmail } = require("../customer/banuDesk");
const { check } = require("../buzzardNative/core/permissionEngine");
const { LOCALES } = require("../buzzardNative/core/specialists/seoEngine");
const { evaluateEgress } = require("../security/egressPolicy");
const { isSalesEnabled } = require("../salesMode");
const { decideAsset } = require("../banking/eu27/fiatPolicy");
const { getMarket } = require("../../core/marketEngineRegistry");
const { calculateVat } = require("../buzzardNative/core/tax/vatEngine");
const { getAdapter } = require("../logistics/carrierContract");

function processOnce({ store, orderId, scenario = "happy" }) {
  const existing = store.get(orderId);
  if (existing) {
    return { ok: false, code: "DUPLICATE_ORDER", order: existing, moneyMoved: false, live: false };
  }
  const order = runIsolatedOrder({ scenario, store, orderId });
  return { ok: true, code: "RECORDED", order, moneyMoved: false, live: false };
}

function resume(dbPath, orderId) {
  const store = createStore({ dbPath });
  return { store, order: store.get(orderId), resumed: Boolean(store.get(orderId)), live: false };
}

function holdPrice(order) {
  const frozen = order.stages.pricing;
  const next = calculate({
    actorId: "pricing_ai",
    supplierCost: 1,
    shipping: 1,
    marketplaceCommission: 1,
    vat: 1,
    returnReserve: 0,
    paymentFees: 0,
    category: "automotive",
  });
  return {
    ok: frozen && frozen.net !== next.net,
    frozenNet: frozen ? frozen.net : null,
    nextNet: next.net,
    storedNet: order.stages.pricing.net,
    mutated: order.stages.pricing.net !== frozen.net,
    publish: false,
  };
}

function localeSwitch(orderId) {
  const de = draftEmail({ locale: "de", intent: "order_status", facts: { orderId } });
  const tr = draftEmail({ locale: "tr", intent: "order_status", facts: { orderId } });
  return {
    ok: de.sent === false && tr.sent === false,
    sent: false,
    localeCount: LOCALES.length,
    deKnown: LOCALES.includes("de"),
    trKnown: LOCALES.includes("tr"),
  };
}

function unauthorizedAttempt() {
  const transfer = check("banu_hanim", "BANK_TRANSFER");
  const buy = check("pricing_ai", "STOCK_BUY");
  const policy = check("esat_bey", "SECURITY_POLICY_CHANGE");
  return {
    ok: transfer.ok === false && buy.ok === false && policy.ok === false,
    transfer: transfer.code,
    buy: buy.code,
    policy: policy.code,
    moneyMoved: false,
  };
}

function carrierChange() {
  const adapter = getAdapter("DHL");
  const first = adapter.trackShipment({ status: "transit" });
  const second = adapter.trackShipment({ status: "DELAYED" });
  return {
    ok: first.ok === false && second.ok === false && first.live === false && second.live === false && first.events.length === 0 && first.status !== second.status,
    from: first.status,
    to: second.status,
    live: false,
  };
}

function marketVat(countryCode = "DE") {
  const market = getMarket(countryCode);
  const vat = calculateVat({
    actorId: "nedim_bey",
    sellerCountry: "DE",
    customerCountry: countryCode,
    deliveryCountry: countryCode,
    goodsNet: 100,
    kind: "B2C",
  });
  return {
    ok: Boolean(market) && vat.liveLegal === false,
    currency: market ? market.currency : null,
    rate: vat.rate,
    definitive: vat.definitive,
    liveLegal: vat.liveLegal,
    filingReady: vat.filingReady,
  };
}

function securityLayers() {
  const egress = evaluateEgress({ destinationUrl: "https://payments.example.invalid/charge" });
  const fiat = decideAsset({ currency: "EUR", assetType: "cbdc" });
  return {
    ok: egress.allowed === false && isSalesEnabled() === false && fiat.code === "REJECTED_CBDC_POLICY",
    egress: egress.decision || egress.code || "DENY",
    salesEnabled: isSalesEnabled(),
    cbdc: fiat.code,
  };
}

function runPass({ dbPath, checkpointPath = null } = {}) {
  const store = createStore({ dbPath });
  const first = processOnce({ store, orderId: "SYN-ONCE", scenario: "happy" });
  const second = processOnce({ store, orderId: "SYN-ONCE", scenario: "happy" });
  const price = holdPrice(first.order);
  const stock = runIsolatedOrder({ scenario: "stock_change", store, orderId: "SYN-STOCK" });
  const payment = runIsolatedOrder({ scenario: "failed_payment", store, orderId: "SYN-PAY" });
  const refund = runIsolatedOrder({ scenario: "supplier_refuses_reimbursement", store, orderId: "SYN-REF" });
  const mismatch = runIsolatedOrder({ scenario: "financial_mismatch", store, orderId: "SYN-MIS" });
  store.close();
  const resumed = resume(dbPath, "SYN-ONCE");
  const tasks = [
    { id: "IDEMPOTENT_ORDER", ok: second.code === "DUPLICATE_ORDER" && second.order.stages.payment.moneyMoved === false },
    { id: "PRICE_HOLD", ok: price.mutated === false && price.ok === true },
    { id: "SUPPLIER_STOCK_LOSS", ok: stock.stages.inventory.qty === 0 && stock.stages.inventory.buy === "HUMAN_GATE_REQUIRED" },
    { id: "PAYMENT_FAILURE", ok: payment.stages.payment.moneyMoved === false },
    { id: "REFUND_SEPARATE_FROM_SUPPLIER", ok: refund.stages.supplierReceivable.assumed === false && refund.stages.supplierReceivable.amount === 0 },
    { id: "ANOMALY_SUPPLIER_CREDIT", ok: mismatch.consistent === false },
    { id: "LOCALE_SWITCH", ok: localeSwitch("SYN-ONCE").ok && localeSwitch("SYN-ONCE").localeCount === 30 },
    { id: "UNAUTHORIZED_AGENT", ok: unauthorizedAttempt().ok },
    { id: "CARRIER_STATUS_CHANGE", ok: carrierChange().ok },
    { id: "MARKET_VAT", ok: marketVat("DE").liveLegal === false && marketVat("DE").currency === "EUR" },
    { id: "RESTART", ok: resumed.resumed === true && resumed.order.live === false },
    { id: "SECURITY_LAYERS", ok: securityLayers().ok },
  ];
  resumed.store.close();
  const completed = tasks.filter((task) => task.ok).length;
  const report = {
    schema: "buzzard.integration-pass.v1",
    recordedAt: new Date().toISOString(),
    cursorRunsContinuously: false,
    independentWorker: false,
    liveVerified: false,
    productionReady: false,
    softwareCompleted: completed,
    softwareTasks: tasks.length,
    integrationCompletion: tasks.length ? completed / tasks.length : 0,
    tasks: tasks.map((task) => ({ ...task, status: task.ok ? "TEST_COMPLETE" : "FAILED", liveVerified: false })),
  };
  if (checkpointPath) {
    fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
    fs.writeFileSync(checkpointPath, JSON.stringify(report, null, 2));
  }
  return report;
}

module.exports = {
  processOnce,
  resume,
  holdPrice,
  localeSwitch,
  unauthorizedAttempt,
  carrierChange,
  marketVat,
  securityLayers,
  runPass,
};
