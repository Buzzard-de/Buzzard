/**
 * Local calls into the twelve commerce engines.
 * A blocked or unknown result stays blocked. Nothing here is a live integration.
 */
const permission = require("../buzzardNative/core/permissionEngine");
const { evaluateOffer, selectTransportCost } = require("./pricingPolicy");
const { decideAsset } = require("../banking/eu27/fiatPolicy");
const { deriveStockStatus } = require("../operations/stockEngine");
const { buyStock, paySupplier, inspectFeeds } = require("../buzzardNative/core/specialists/stockEngine");
const { reply, refund } = require("../buzzardNative/core/specialists/banuEngine");
const { notifyCustomer } = require("../logistics/v5/notifyStub");
const { startReturn } = require("../logistics/v5/returnsEngine");
const { getMarket, EU_COUNTRY_CODES } = require("../../core/marketEngineRegistry");
const { validateHierarchy } = require("./categoryHierarchy");
const { placeOrder } = require("./storefrontCatalogAdapter");
const { isSalesEnabled } = require("../salesMode");
const path = require("path");

const ENGINE_IDS = Object.freeze([
  "product",
  "order",
  "inventory",
  "customer",
  "market",
  "supplier",
  "pricing",
  "payment",
  "shipping",
  "returns",
  "notification",
  "reporting",
]);

const DEPENDENCIES = Object.freeze({
  product: [],
  inventory: ["supplier"],
  supplier: [],
  pricing: [],
  shipping: ["pricing"],
  payment: ["pricing"],
  market: [],
  customer: [],
  order: ["pricing", "inventory", "shipping", "payment"],
  returns: ["order"],
  notification: ["customer"],
  reporting: ["product", "order", "pricing", "shipping", "payment"],
});

const SENSITIVE = Object.freeze({
  order: "SALES_WRITE",
  inventory: "STOCK_BUY",
  supplier: "SUPPLIER_PAY",
  payment: "LIVE_PAYMENT",
  shipping: "SHIPMENT_CREATE",
  customer: "DATA_EXPORT",
  returns: "CUSTOMER_REFUND",
});

const audits = [];
const idempotency = new Map();

function audit(entry) {
  audits.push({ at: new Date().toISOString(), ...entry });
  if (audits.length > 500) audits.shift();
}

function actorOk(actorId) {
  const resolved = permission.check(actorId, "CREATE_REPORTS");
  if (resolved.code === "UNKNOWN_IDENTITY") return { ok: false, code: "UNKNOWN_IDENTITY" };
  return { ok: true, agentId: resolved.agentId };
}

function sensitiveOperation(engineId, input) {
  const action = typeof input.action === "string" ? input.action : "";
  const flagged = input.sensitive === true;
  const spec = (permission, proof) => ({ permission, proof: { performed: false, ...proof } });
  if (engineId === "customer" && action === "refund") return spec("CUSTOMER_REFUND", { customerRefund: null });
  if (engineId === "order" && (flagged || action === "create" || action === "place")) return spec(SENSITIVE.order, { orderCreated: false, paymentAuthorized: false });
  if (engineId === "inventory" && (flagged || action === "buy")) return spec(SENSITIVE.inventory, { purchased: false, stockChanged: false });
  if (engineId === "supplier" && (flagged || action === "pay")) return spec(SENSITIVE.supplier, { purchased: false });
  if (engineId === "payment" && (flagged || action === "capture")) return spec(SENSITIVE.payment, { captured: false, cardStored: false });
  if (engineId === "shipping" && (flagged || action === "create" || action === "ship")) return spec(SENSITIVE.shipping, { shipmentCreated: false });
  if (engineId === "customer" && (flagged || action === "export")) return spec(SENSITIVE.customer, { exported: false });
  if (engineId === "returns" && (flagged || action === "refund" || action === "execute")) return spec(SENSITIVE.returns, { customerRefund: null, supplierCredit: null, labelIssued: false });
  if (flagged) return spec("POLICY_CHANGE", {});
  return null;
}

function rejectSensitive(engineId, actorId, code, operation) {
  return {
    ok: false,
    code,
    engineId,
    actorId: actorId || null,
    action: operation.permission,
    live: false,
    salesEnabled: isSalesEnabled(),
    ...operation.proof,
    performed: false,
  };
}

function runProduct(input, root) {
  if (!input.sku || typeof input.sku !== "string") return { ok: false, code: "INVALID_INPUT", missing: ["sku"], found: false, price: null, live: false };
  const hierarchy = validateHierarchy({ root });
  return {
    ok: hierarchy.ok === true,
    code: hierarchy.ok ? "CATALOG_FRAME_READY" : "CATALOG_FRAME_INVALID",
    sku: input.sku,
    found: false,
    price: null,
    categories: hierarchy.count,
    live: false,
  };
}

function runInventory(input) {
  if (input.action === "buy") {
    return { ...buyStock(), live: false, purchased: false, stockChanged: false, sellable: false, liveSupplierApi: false };
  }
  const status = deriveStockStatus(input.quantity);
  const feeds = inspectFeeds({ actorId: input.actorId || "stock_ai", feeds: Array.isArray(input.feeds) ? input.feeds : [] });
  const known = status.status === "IN_STOCK" || status.status === "LOW_STOCK" || status.status === "OUT_OF_STOCK";
  return {
    ok: known && feeds.ok === true,
    code: feeds.ok === false ? feeds.code : status.status,
    quantity: status.quantity,
    sellable: false,
    purchased: false,
    stockChanged: false,
    liveSupplierApi: false,
    live: false,
  };
}

function runSupplier(input) {
  if (input.action === "pay") return { ...paySupplier(), live: false, purchased: false, stockChanged: false };
  return { ok: false, code: "SUPPLIER_DATA_UNKNOWN", live: false, purchased: false, stockChanged: false, price: null, stock: null };
}

function runPricing(input) {
  const offer = evaluateOffer(input);
  return {
    ok: offer.status === "CALCULATED",
    code: offer.code || offer.status,
    status: offer.status,
    commercialEligibility: offer.commercialEligibility || "BLOCKED",
    amount: offer.salePrice ?? null,
    invented: false,
    livePriceWrite: false,
    live: false,
  };
}

function runShipping(input) {
  const selected = selectTransportCost(input);
  return {
    ok: selected.ok === true,
    code: selected.code,
    shippingCost: selected.ok ? selected.shippingCost : null,
    commercialEligibility: selected.commercialEligibility,
    volumetricRule: selected.volumetricRule,
    shipmentCreated: false,
    apiConnected: false,
    live: false,
  };
}

function runPayment(input) {
  if (input.action === "capture") return { ok: false, code: "PAYMENT_NOT_LIVE", captured: false, paymentCaptured: false, cardStored: false, live: false };
  const asset = decideAsset({ currency: input.currency, assetType: input.assetType });
  return { ok: asset.code === "FIAT_ACCEPTED", code: asset.code, captured: false, paymentCaptured: false, cardStored: false, live: false };
}

function runMarket(input) {
  const code = String(input.country || "").toUpperCase();
  if (!EU_COUNTRY_CODES.has(code)) return { ok: false, code: "UNKNOWN_MARKET", country: code || null, vatOfficial: false, vatRate: null, live: false };
  const market = getMarket(code);
  return {
    ok: Boolean(market),
    code: market ? "MARKET_FRAME_READY" : "UNKNOWN_MARKET",
    country: code,
    currency: market ? market.currency : null,
    vatOfficial: false,
    vatVerified: false,
    vatRate: null,
    vatSnapshot: market && market.vat ? market.vat.standardRate : null,
    live: false,
  };
}

function runCustomer(input) {
  const closed = { live: false, exported: false, customerRefund: null, sent: false, notificationSent: false, liveMailbox: false };
  if (input.action === "export") return { ok: false, code: "DATA_EXPORT_BLOCKED", ...closed };
  if (input.action === "refund") return { ...refund(), ...closed };
  return { ...reply({ actorId: input.actorId, intent: input.intent, verifiedFacts: input.verifiedFacts || {}, locale: input.locale }), ...closed };
}

function runOrder() {
  const placed = placeOrder();
  return { ...placed, salesEnabled: isSalesEnabled(), paymentAuthorized: false, orderCreated: false, moneyMoved: false, live: false };
}

function runReturns(input) {
  const started = startReturn({
    shipmentId: input.shipmentId || "",
    orderId: input.orderId,
    customerId: input.customerId,
    ownerId: input.ownerId,
  });
  return { ...started, ok: false, live: false, supplierCredit: null, customerRefund: null, customerRefundIssued: false, labelIssued: false };
}

function runNotification(input) {
  const notice = notifyCustomer({ channel: input.channel, event: input.event, verified: false });
  return { ok: false, code: notice.reason, ...notice, sent: false, notificationSent: false, live: false };
}

function runReporting() {
  return {
    ok: true,
    code: "SYNTHETIC_REPORT",
    synthetic: true,
    production: false,
    calls: audits.length,
    liveMetrics: null,
    live: false,
  };
}

const RUNNERS = {
  product: runProduct,
  inventory: runInventory,
  supplier: runSupplier,
  pricing: runPricing,
  shipping: runShipping,
  payment: runPayment,
  market: runMarket,
  customer: runCustomer,
  order: runOrder,
  returns: runReturns,
  notification: runNotification,
  reporting: runReporting,
};

function callEngine(engineId, input = {}, options = {}) {
  const started = Date.now();
  const id = String(engineId || "");
  if (!ENGINE_IDS.includes(id)) {
    const missing = { ok: false, code: "UNKNOWN_ENGINE", engineId: id, live: false };
    audit({ engineId: id, code: missing.code, ok: false });
    return missing;
  }
  if (options.deadlineMs != null && Date.now() > Number(options.deadlineMs)) {
    const late = { ok: false, code: "TIMEOUT", engineId: id, live: false, elapsedMs: 0 };
    audit({ engineId: id, code: late.code, actorId: input.actorId || null, ok: false });
    return late;
  }
  const actor = actorOk(input.actorId);
  const operation = sensitiveOperation(id, input);
  if (!actor.ok) {
    audit({ engineId: id, code: actor.code, actorId: input.actorId || null, ok: false });
    if (operation) return rejectSensitive(id, input.actorId, actor.code, operation);
    return { ok: false, code: actor.code, engineId: id, live: false };
  }
  const key = input.idempotencyKey ? `${id}:${input.idempotencyKey}` : null;
  if (key && idempotency.has(key)) {
    return { ...idempotency.get(key), replay: true, elapsedMs: Date.now() - started };
  }
  if (operation) {
    const gate = permission.check(input.actorId, operation.permission);
    const blocked = rejectSensitive(id, actor.agentId, gate.ok ? "LIVE_ACTION_CLOSED" : gate.code, operation);
    audit({ engineId: id, code: blocked.code, actorId: actor.agentId, ok: false });
    if (key) idempotency.set(key, blocked);
    return blocked;
  }
  let result;
  try {
    result = id === "product" ? runProduct(input, options.root || path.join(__dirname, "..", "..", "..")) : RUNNERS[id](input);
  } catch (error) {
    result = { ok: false, code: "ENGINE_FAULT", error: String(error && error.message ? error.message : error), live: false };
  }
  const envelope = {
    ...result,
    engineId: id,
    actorId: actor.agentId,
    dependencies: DEPENDENCIES[id],
    live: false,
    elapsedMs: Date.now() - started,
    replay: false,
  };
  audit({ engineId: id, code: envelope.code, actorId: actor.agentId, ok: envelope.ok === true });
  if (key) idempotency.set(key, envelope);
  return envelope;
}

function runChain(input = {}, options = {}) {
  const results = {};
  for (const id of ENGINE_IDS) {
    const deps = DEPENDENCIES[id];
    const blockedDep = deps.find((dep) => results[dep] && results[dep].ok === false && input.requireDependencies === true);
    if (blockedDep) {
      results[id] = { ok: false, code: "DEPENDENCY_BLOCKED", engineId: id, blockedBy: blockedDep, live: false };
      continue;
    }
    results[id] = callEngine(id, { ...input, ...(input.engines && input.engines[id] ? input.engines[id] : {}) }, options);
  }
  return {
    ok: false,
    executed: ENGINE_IDS.every((id) => results[id].code !== "ENGINE_FAULT"),
    commercialReady: false,
    engines: results,
    orderCreated: results.order.orderCreated === true,
    paymentCaptured: results.payment.captured === true || results.payment.paymentCaptured === true,
    shipmentCreated: results.shipping.shipmentCreated === true,
    salesEnabled: isSalesEnabled(),
    synthetic: true,
    live: false,
  };
}

function auditTrail() {
  return audits.map((entry) => ({ ...entry }));
}

module.exports = {
  ENGINE_IDS,
  DEPENDENCIES,
  callEngine,
  runChain,
  auditTrail,
};
