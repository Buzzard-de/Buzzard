/**
 * Automotive Production Integration — order integration manager.
 */
const automotiveCore = require("../automotiveCore");
const { canCreateLiveOrder } = require("./productionSafety");
const { productionError } = require("./productionErrors");
const { checkIdempotency, storeIdempotency, createSupplierConnector } = require("./supplierConnectorManager");
const { recommendSupplier } = require("./productMatchingManager");
const { recordIntegrationAudit } = require("./integrationAudit");

const ORDER_FLOW = Object.freeze([
  "DRAFT", "PAYMENT_PENDING", "PAID", "SUPPLIER_PENDING", "SUPPLIER_ORDERED",
  "CONFIRMED", "SHIPPED", "DELIVERED", "SUPPLIER_FAILED", "PAYMENT_FAILED",
  "ORDER_CANCELLED", "RETURN_REQUESTED", "REFUNDED",
]);

function sanitizeOrderForLog(order = {}) {
  return {
    orderId: order.orderId || order.id,
    sku: order.sku,
    supplierId: order.supplierId,
    state: order.state,
    quantity: order.quantity,
  };
}

function createCustomerOrder(order = {}, context = {}) {
  const idempotencyKey = order.idempotencyKey || `${order.customerOrderId}:${order.supplierId}`;
  const dup = checkIdempotency(idempotencyKey);
  if (dup.duplicate) {
    return { ok: false, ...productionError("ORDER_DUPLICATE", "Duplicate order detected") };
  }

  const state = "DRAFT";
  const result = {
    ok: true,
    orderId: order.orderId || `ORD-${Date.now()}`,
    state,
    live: false,
    supplierOrderAllowed: canCreateLiveOrder(),
  };

  recordIntegrationAudit({
    action: "ORDER_CREATED",
    entityId: result.orderId,
    metadata: sanitizeOrderForLog(result),
  });

  storeIdempotency(idempotencyKey, result);
  return result;
}

async function submitSupplierOrder(order = {}, offers = []) {
  if (!canCreateLiveOrder()) {
    recordIntegrationAudit({
      action: "SUPPLIER_ORDER_CREATED",
      entityId: order.orderId,
      result: "BLOCKED",
    });
    return {
      ok: false,
      ...productionError("ORDER_LIVE_DISABLED", "Live supplier orders blocked"),
      state: "SUPPLIER_PENDING",
      dryRun: true,
    };
  }

  const recommendation = recommendSupplier(offers);
  const connector = createSupplierConnector(order.supplierId, { mode: "real" });
  const supplierResult = await connector.createOrder(order);

  return supplierResult;
}

function processOrderStateTransition(order = {}, targetState) {
  const allowed = ORDER_FLOW.includes(targetState);
  if (!allowed) {
    return { ok: false, ...productionError("INVALID_PRODUCT", `Invalid order state: ${targetState}`) };
  }
  return { ok: true, orderId: order.orderId, from: order.state, to: targetState, live: false };
}

function runOrderDryRun(order = {}, offers = []) {
  const created = createCustomerOrder(order);
  const supplier = recommendSupplier(offers);
  return {
    mode: "DRY_RUN",
    order: created,
    supplierRecommendation: supplier,
    supplierOrderCreated: false,
    liveCalls: 0,
  };
}

module.exports = {
  ORDER_FLOW,
  createCustomerOrder,
  submitSupplierOrder,
  processOrderStateTransition,
  runOrderDryRun,
  sanitizeOrderForLog,
};
