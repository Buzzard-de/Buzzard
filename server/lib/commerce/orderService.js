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
    phase3: require("./phase3Identity").phase3Identity(row.id),
  };
}

function idempotencyHash(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

function recordCanonicalOrder({
  orderType = ORDER_TYPE.DRY_RUN,
  checkoutId = null,
  customerId = null,
  currency = "EUR",
  subtotal = 0,
  shipping = 0,
  tax = 0,
  discount = 0,
  total = 0,
  items = [],
  payment = null,
  idempotencyKey = null,
  channel = "commerce",
  metadata = {},
  req = null,
} = {}) {
  const block = assertCanCreateOrder({ orderType, req });
  if (block && isCommercialOrderType(orderType)) return block;
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "At least one item is required", code: "ITEMS_REQUIRED", status: 400 };
  }
  if (payment?.captured === true || payment?.realMoneyMovement === true) {
    return { error: "payment_capture_refused", code: "PAYMENT_NOT_LIVE", status: 403, captured: false, realMoneyMovement: false };
  }

  if (idempotencyKey) {
    const existing = db
      .prepare("SELECT resource_id FROM commerce_idempotency WHERE key_hash = ? AND scope = ?")
      .get(idempotencyHash(idempotencyKey), "canonical_order");
    if (existing?.resource_id) {
      const row = db.prepare("SELECT * FROM commerce_orders WHERE id = ?").get(existing.resource_id);
      if (row) return { ...mapOrder(row), created: false, canonical: true };
    }
  }

  const id = newId("ord");
  const status = isCommercialOrderType(orderType) ? ORDER_STATUS.PENDING : ORDER_STATUS.CONFIRMED;
  const meta = {
    ...metadata,
    channel,
    dryRun: !isCommercialOrderType(orderType),
    paymentReference: payment?.reference || null,
    paymentStatus: payment?.status || "NONE",
    captured: false,
    realMoneyMovement: false,
    supplierOrderSubmitted: false,
    canonicalWriter: "orderService.recordCanonicalOrder",
  };

  db.prepare(`
    INSERT INTO commerce_orders(
      id, checkout_id, customer_id, order_type, status, payment_status, fulfillment_status,
      currency, subtotal, shipping, tax, discount, total, items_json, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    checkoutId,
    customerId,
    orderType,
    status,
    payment?.status || "NONE",
    "NONE",
    currency || "EUR",
    subtotal || 0,
    shipping || 0,
    tax || 0,
    discount || 0,
    total || 0,
    JSON.stringify(items),
    JSON.stringify(meta)
  );

  if (idempotencyKey) {
    db.prepare(`
      INSERT INTO commerce_idempotency(key_hash, scope, resource_id, response_json)
      VALUES (?, ?, ?, ?)
    `).run(idempotencyHash(idempotencyKey), "canonical_order", id, JSON.stringify({ id }));
  }

  return { ...mapOrder(db.prepare("SELECT * FROM commerce_orders WHERE id = ?").get(id)), created: true, canonical: true };
}

function createOrderFromCheckout({ checkout, payment, orderType, req, actorId = null }) {
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

  const customerId = String(checkout?.customerId || "").trim();
  if (!customerId) {
    return { error: "customer_required", code: "auth_required", status: 401, blocked: true };
  }

  const totals = checkout.totals || {};
  const cartService = require("./cartService");
  const cart = cartService.getCart(checkout.cartId, { customerId, req });
  if (cart.error || cart.blocked) {
    return { error: cart.error, code: cart.error, status: cart.status || 403, blocked: true };
  }
  if (!cart.cart?.customerId || String(cart.cart.customerId) !== customerId) {
    return { error: "idor_denied", code: "idor_denied", status: 403, blocked: true };
  }
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

  let actor = actorId;
  if (!actor && req) {
    try {
      actor = require("./commerceGuards").verifiedCommerceIdentity(req)?.id || null;
    } catch {
      actor = null;
    }
  }
  const gate = require("../software/control").enforce({
    engine: "order",
    method: "createOrderFromCheckout",
    actorId: actor,
    mode: "write",
  });
  if (!gate.ok) return { ...gate, status: 401 };

  return recordCanonicalOrder({
    orderType,
    checkoutId: checkout.id,
    customerId: checkout.customerId,
    currency: totals.currency || "EUR",
    subtotal: totals.subtotal || 0,
    shipping: totals.shipping || 0,
    tax: totals.tax || 0,
    discount: totals.discount || 0,
    total: totals.total || 0,
    items,
    payment,
    idempotencyKey: checkout.idempotencyKey || null,
    channel: "checkout",
    req,
  });
}

function getOrder(orderId, ctx = {}) {
  const requestedSkip = ctx.req && (
    ctx.req.body?.skipAccessCheck === true
    || ctx.req.query?.skipAccessCheck === true
    || ctx.req.query?.skipAccessCheck === "true"
    || ctx.skipAccessCheck === true
  );
  if (requestedSkip) {
    return { error: "SKIP_ACCESS_FORBIDDEN", status: 403, blocked: true };
  }
  const internalSkip = ctx.skipAccessCheck === true && ctx.internal === true && !ctx.req;
  if (ctx.req) {
    const { assertCommerceCredential } = require("./commerceGuards");
    const credential = assertCommerceCredential(ctx.req);
    if (!credential || credential.blocked) {
      return { error: "auth_required", status: 401, blocked: true, message: "Authentication required" };
    }
  }
  const row = db.prepare("SELECT * FROM commerce_orders WHERE id = ?").get(orderId);
  if (!row) return { error: "order_not_found", status: 404 };

  const { assertCustomerResourceAccess, refuseIdentityLessRecord } = require("./commerceGuards");
  const identityBlock = refuseIdentityLessRecord(row, ctx, "order");
  if (identityBlock?.blocked) {
    return { error: identityBlock.code, status: identityBlock.status || 401, blocked: true, message: identityBlock.message };
  }
  if (!ctx.req && !internalSkip) {
    const access = assertCustomerResourceAccess({
      resourceCustomerId: row.customer_id,
      requestCustomerId: ctx.customerId,
      resourceType: "order",
      req: ctx.req,
    });
    if (access?.blocked && row.customer_id) {
      return { error: access.code, status: access.status || 403, blocked: true, message: access.message };
    }
  }

  return mapOrder(row);
}

function transitionOrderStatus(orderId, toStatus, { actorId = null } = {}) {
  const gate = require("../software/control").enforce({
    engine: "order",
    method: "transitionOrderStatus",
    actorId,
    mode: "write",
  });
  if (!gate.ok) return { ...gate, status: 401 };
  const row = db.prepare("SELECT status FROM commerce_orders WHERE id = ?").get(orderId);
  if (!row) return { error: "order_not_found", status: 404 };
  if (!canTransitionOrder(row.status, toStatus)) {
    return { error: "illegal_order_transition", from: row.status, to: toStatus, status: 409 };
  }

  const salesOn = require("../salesMode").isSalesEnabled();
  const livePayment = salesOn && process.env.BUZZARD_PAYMENT_LIVE === "1";
  const liveFulfillment = salesOn && process.env.BUZZARD_FULFILLMENT_LIVE === "1";
  const liveRefund = salesOn && process.env.BUZZARD_REFUND_LIVE === "1";
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
  recordCanonicalOrder,
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
