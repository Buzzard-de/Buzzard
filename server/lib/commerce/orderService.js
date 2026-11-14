/**
 * Part 8 — Order foundation (commercial orders blocked when SALES=0)
 */
const { db } = require("../db");
const {
  ORDER_STATUS,
  ORDER_TYPE,
  canTransitionOrder,
  isCommercialOrderType,
} = require("../../core/commerceConstants");
const {
  assertCanCreateOrder,
  assertCanSubmitSupplierOrder,
  logCommerceBlock,
} = require("./commerceGuards");
const { logSecurityEvent } = require("../securityLog");
const { listAudit } = require("../coreAudit");
const { selectTransportCost } = require("./pricingPolicy");
const { quoteRate } = require("../banking/eu27/fx");
const { decideAsset } = require("../banking/eu27/fiatPolicy");

function parseJson(val, fallback = {}) {
  try {
    return JSON.parse(val || "{}");
  } catch {
    return fallback;
  }
}

function mapOrder(row) {
  return {
    id: row.id,
    checkoutId: row.checkout_id,
    customerId: row.customer_id,
    orderType: row.order_type,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    currency: row.currency,
    subtotal: row.subtotal,
    shipping: row.shipping,
    tax: row.tax,
    discount: row.discount,
    total: row.total,
    items: parseJson(row.items_json, []),
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
    isCommercial: isCommercialOrderType(row.order_type),
  };
}

function refuseOrder(code, status = 409, reasons = []) {
  return {
    ok: false,
    error: code,
    code,
    status,
    reasons,
    blocked: true,
    orderCreated: false,
    paymentAuthorized: false,
    paymentCaptured: false,
    purchased: false,
    live: false,
    commercialEligibility: "BLOCKED",
    shipping: null,
    supplierCost: null,
    total: null,
  };
}

function moneyPresent(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function existingOrderForCheckout(checkoutId) {
  if (!checkoutId) return null;
  try {
    return db.prepare("SELECT id FROM commerce_orders WHERE checkout_id = ?").get(checkoutId) || null;
  } catch {
    return null;
  }
}

function orderBlockReasons(checkout, payment, salesOpen) {
  const totals = checkout.totals || {};
  const reasons = [];
  if (checkout.mock === true || payment?.mock === true || payment?.mockOnly === true || payment?.dryRun === true) {
    reasons.push("MOCK_NOT_COMMERCIAL");
  }
  const currency = totals.currency || checkout.currency || payment?.currency;
  const assetType = payment?.assetType || checkout.assetType;
  const instrument = payment?.instrument || checkout.instrument;
  if (currency || assetType || instrument) {
    const asset = decideAsset({ currency, assetType, instrument });
    if (!asset.ok) reasons.push(asset.code);
  }
  const transport = selectTransportCost(checkout.transport || {});
  if (transport.ok !== true || transport.live === true) reasons.push("SHIPPING_RATE_UNVERIFIED");
  if (!moneyPresent(checkout.marketplaceFee ?? totals.marketplaceFee)) reasons.push("MARKETPLACE_FEE_UNVERIFIED");
  if (!moneyPresent(checkout.paymentFee ?? totals.paymentFee)) reasons.push("PAYMENT_FEE_UNVERIFIED");
  reasons.push("VAT_UNVERIFIED");
  const fx = quoteRate({ base: totals.currency || checkout.currency, quote: "EUR" });
  if (fx.ok !== true || fx.code !== "IDENTITY_RATE" || fx.live === true || checkout.fxVerified === true || checkout.fxLive === true) {
    reasons.push("FX_UNVERIFIED");
  }
  reasons.push("SUPPLIER_COST_UNVERIFIED");
  if (!moneyPresent(totals.subtotal)) reasons.push("PRODUCT_COST_UNVERIFIED");
  reasons.push("STOCK_UNVERIFIED");
  reasons.push("PAYMENT_UNVERIFIED");
  if (!salesOpen) reasons.push("SALES_CLOSED");
  return reasons;
}

function createOrderFromCheckout({ checkout = {}, payment = {}, orderType, req } = {}) {
  const salesOpen = require("../salesMode").isSalesEnabled();
  const block = assertCanCreateOrder({ orderType, req });
  if (block && isCommercialOrderType(orderType)) {
    return { ...block, ...refuseOrder(block.code || "SALES_CLOSED", block.status || 403), blocked: true };
  }

  if (existingOrderForCheckout(checkout.id)) return refuseOrder("DUPLICATE_ORDER");
  const totals = checkout.totals || {};
  const reasons = orderBlockReasons(checkout, payment, salesOpen);
  if (reasons.length) return refuseOrder(reasons[0], reasons[0] === "SALES_CLOSED" ? 403 : 409, reasons);
  return refuseOrder("ORDER_UNVERIFIED", 409, ["ORDER_UNVERIFIED", "STOCK_UNVERIFIED", "PAYMENT_UNVERIFIED"]);
}

function getOrder(orderId, ctx = {}) {
  const row = db.prepare("SELECT * FROM commerce_orders WHERE id = ?").get(orderId);
  if (!row) return { error: "order_not_found", status: 404 };

  const { assertCustomerResourceAccess } = require("./commerceGuards");
  const access = assertCustomerResourceAccess({
    resourceCustomerId: row.customer_id,
    requestCustomerId: ctx.customerId,
    resourceType: "order",
    req: ctx.req,
  });
  if (access?.blocked && row.customer_id) {
    return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
  }

  return mapOrder(row);
}

function transitionOrderStatus(orderId, toStatus) {
  const row = db.prepare("SELECT status FROM commerce_orders WHERE id = ?").get(orderId);
  if (!row) return { error: "order_not_found", status: 404 };
  if (!canTransitionOrder(row.status, toStatus)) {
    return { error: "illegal_order_transition", from: row.status, to: toStatus, status: 409 };
  }

  if (toStatus === ORDER_STATUS.PAID) {
    return { error: "PAYMENT_NOT_LIVE", code: "PAYMENT_NOT_LIVE", from: row.status, to: toStatus, status: 403, live: false };
  }
  if (toStatus === ORDER_STATUS.SHIPPED || toStatus === ORDER_STATUS.DELIVERED) {
    return { error: "FULFILLMENT_NOT_LIVE", code: "FULFILLMENT_NOT_LIVE", from: row.status, to: toStatus, status: 403, live: false };
  }
  if (toStatus === ORDER_STATUS.REFUNDED) {
    return { error: "REFUND_NOT_LIVE", code: "REFUND_NOT_LIVE", from: row.status, to: toStatus, status: 403, live: false };
  }

  db.prepare("UPDATE commerce_orders SET status = ? WHERE id = ?").run(toStatus, orderId);
  return getOrder(orderId);
}

function submitSupplierOrder(orderId, { req } = {}) {
  const block = assertCanSubmitSupplierOrder({ req });
  if (block) {
    return { ...block, supplierOrderCreated: false };
  }

  const order = getOrder(orderId);
  if (order.error) return order;

  logCommerceBlock("order_creation_blocked", { orderId, type: "supplier_boundary", dryRun: true }, req);
  const exceptions = require("../exceptionBus");
  exceptions.emit({
    type: exceptions.TYPES.SUPPLIER_NOT_LIVE,
    source: "orderService",
    entity: "order",
    entityId: orderId,
    message: "Supplier order submission is not live",
    retryable: false,
  });
  return {
    error: "supplier_order_blocked",
    code: "SUPPLIER_NOT_LIVE",
    message: "Supplier order submission is disabled in Part 8",
    status: 403,
    orderId,
    supplierOrderCreated: false,
  };
}

function countOrdersByType() {
  const rows = db.prepare("SELECT order_type, COUNT(*) n FROM commerce_orders GROUP BY order_type").all();
  const map = {};
  for (const r of rows) map[r.order_type] = r.n;
  return map;
}

function getCommercialOrderCount() {
  return db.prepare("SELECT COUNT(*) n FROM commerce_orders WHERE order_type = ?").get(ORDER_TYPE.COMMERCIAL).n;
}

function auditCommerceAction(action, actor, metadata = {}) {
  const { logAudit } = require("../coreAudit");
  return logAudit({
    action: `commerce.${action}`,
    actorType: actor?.type || "system",
    actorId: actor?.id || "system",
    resourceType: "commerce",
    resourceId: metadata.resourceId || null,
    metadata: { ...metadata, secretsRedacted: true },
  });
}

function planLogisticsDryRun(orderLike = {}) {
  const { runDryRun } = require("../logistics/v5/operationsPlane");
  return runDryRun({
    destination: orderLike.destination || orderLike.country || "DE",
    originCountry: orderLike.originCountry || "DE",
    postalCode: orderLike.postalCode,
    weightKg: orderLike.weightKg,
    productClass: orderLike.productClass,
    supplierId: orderLike.supplierId,
    partyKnown: false,
  });
}

module.exports = {
  createOrderFromCheckout,
  getOrder,
  transitionOrderStatus,
  submitSupplierOrder,
  countOrdersByType,
  getCommercialOrderCount,
  auditCommerceAction,
  mapOrder,
  planLogisticsDryRun,
};
