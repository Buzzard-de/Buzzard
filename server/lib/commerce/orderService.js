/**
 * Part 8 — Order foundation (commercial orders blocked when SALES=0)
 */
const crypto = require("crypto");
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

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

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

function createOrderFromCheckout({ checkout, payment, orderType, req }) {
  const block = assertCanCreateOrder({ orderType, req });
  if (block && isCommercialOrderType(orderType)) return block;

  if (!isCommercialOrderType(orderType)) {
    const commercialCount = db
      .prepare("SELECT COUNT(*) n FROM commerce_orders WHERE order_type = ?")
      .get(ORDER_TYPE.COMMERCIAL).n;
    if (commercialCount > 0 && !require("../salesMode").isSalesEnabled()) {
      logSecurityEvent({
        type: "order_creation_blocked",
        success: false,
        detail: { reason: "commercial_orders_exist_while_sales_disabled" },
      });
    }
  }

  const totals = checkout.totals || {};
  const cartService = require("./cartService");
  const cart = cartService.getCart(checkout.cartId);
  const pathAdapter = require("./canonicalCommercePath");
  const items = [];
  for (const i of cart.items || []) {
    const snap = pathAdapter.buildImmutableSnapshot(i.productId, i.quantity);
    if (!snap.ok) {
      return { error: snap.error, code: snap.code, status: snap.status || 400 };
    }
    items.push({
      productId: i.productId,
      canonicalProductId: i.productId,
      variantId: i.variantId,
      sku: i.sku,
      title: i.title,
      quantity: i.quantity,
      priceSnapshot: i.priceSnapshot,
      unitPrice: i.unitPrice || i.priceSnapshot,
      lineTotal: i.lineTotal,
      snapshotVersion: i.snapshotVersion || snap.snapshotVersion || null,
      productSnapshot: i.productSnapshot || snap.productSnapshot || null,
      priceQuoteSnapshot: snap.ok ? snap.priceSnapshot : null,
      taxSnapshot: snap.ok ? snap.taxSnapshot : null,
      inventorySnapshot: snap.ok ? snap.inventorySnapshot : null,
      supplierSnapshot: snap.supplierSnapshot,
    });
  }

  const id = newId("ord");
  const status = isCommercialOrderType(orderType) ? ORDER_STATUS.PENDING : ORDER_STATUS.CONFIRMED;

  db.prepare(`
    INSERT INTO commerce_orders(
      id, checkout_id, customer_id, order_type, status, payment_status, fulfillment_status,
      currency, subtotal, shipping, tax, discount, total, items_json, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    checkout.id,
    checkout.customerId,
    orderType,
    status,
    payment?.status || "NONE",
    "NONE",
    totals.currency || "EUR",
    totals.subtotal || 0,
    totals.shipping || 0,
    totals.tax || 0,
    totals.discount || 0,
    totals.total || 0,
    JSON.stringify(items),
    JSON.stringify({
      dryRun: !isCommercialOrderType(orderType),
      paymentReference: payment?.reference,
      paymentStatus: payment?.status || "NONE",
      captured: false,
      realMoneyMovement: false,
      supplierOrderSubmitted: false,
    })
  );

  return mapOrder(db.prepare("SELECT * FROM commerce_orders WHERE id = ?").get(id));
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

  const livePayment = process.env.BUZZARD_PAYMENT_LIVE === "1";
  const liveFulfillment = process.env.BUZZARD_FULFILLMENT_LIVE === "1";
  const liveRefund = process.env.BUZZARD_REFUND_LIVE === "1";
  if (toStatus === ORDER_STATUS.PAID && !livePayment) {
    return { error: "PAYMENT_NOT_LIVE", code: "PAYMENT_NOT_LIVE", from: row.status, to: toStatus, status: 403 };
  }
  if ((toStatus === ORDER_STATUS.SHIPPED || toStatus === ORDER_STATUS.DELIVERED) && !liveFulfillment) {
    return { error: "FULFILLMENT_NOT_LIVE", code: "FULFILLMENT_NOT_LIVE", from: row.status, to: toStatus, status: 403 };
  }
  if (toStatus === ORDER_STATUS.REFUNDED && !liveRefund) {
    return { error: "REFUND_NOT_LIVE", code: "REFUND_NOT_LIVE", from: row.status, to: toStatus, status: 403 };
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

module.exports = {
  createOrderFromCheckout,
  getOrder,
  transitionOrderStatus,
  submitSupplierOrder,
  countOrdersByType,
  getCommercialOrderCount,
  auditCommerceAction,
  mapOrder,
};
