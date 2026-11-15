const crypto = require("crypto");
const { db } = require("./db");

const VALID_TRANSITIONS = {
  pending: ["confirmed", "cancelled", "payment_failed"],
  confirmed: ["processing", "cancelled"],
  processing: ["partially_fulfilled", "fulfilled", "cancelled"],
  partially_fulfilled: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
  payment_failed: ["pending"],
};

function isEnabled() {
  return process.env.BUZZARD_ORDER_MANAGEMENT !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function orderNumber() {
  return `BZ-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function recordEvent(orderId, eventType, oldStatus, newStatus, message = "", meta = {}) {
  db.prepare(`
    INSERT INTO oms_order_events(order_id, event_type, old_status, new_status, message, metadata_json)
    VALUES(?,?,?,?,?,?)
  `).run(orderId, eventType, oldStatus, newStatus, message, JSON.stringify(meta || {}));
}

function createOrder(body = {}) {
  const key = body.idempotencyKey || body.idempotency_key;
  if (key) {
    const existing = db
      .prepare(`
        SELECT o.* FROM oms_order_idempotency i
        JOIN oms_orders o ON o.id = i.order_id
        WHERE i.idempotency_key = ?
      `)
      .get(key);
    if (existing) return { ok: false, code: "DUPLICATE_ORDER", error: "DUPLICATE_ORDER", orderCreated: false, status: 409 };
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return { error: "At least one item is required", status: 400, orderCreated: false };

  const { selectTransportCost } = require("./commerce/pricingPolicy");
  const transport = selectTransportCost({
    origin: body.origin || body.supplierOrigin,
    country: body.destinationCountry || body.country,
    zone: body.deliveryZone || body.zone,
    weightKg: body.weightKg,
    dimensions: body.dimensions,
  });
  if (!transport.ok) {
    return {
      error: "SHIPPING_RATE_UNVERIFIED",
      code: transport.code || "SHIPPING_RATE_UNVERIFIED",
      status: 409,
      orderCreated: false,
      shipping: null,
      commercialEligibility: "BLOCKED",
    };
  }
  const salesOpen = require("./salesMode").isSalesEnabled();
  const reasons = [];
  if (!salesOpen) reasons.push("SALES_CLOSED");
  if (body.mock === true || body.demo === true) reasons.push("MOCK_NOT_COMMERCIAL");
  reasons.push("PAYMENT_UNVERIFIED", "SUPPLIER_COST_UNVERIFIED", "STOCK_UNVERIFIED", "VAT_UNVERIFIED");
  return {
    ok: false,
    error: reasons[0],
    code: reasons[0],
    reasons,
    status: 409,
    orderCreated: false,
    shipping: transport.shippingCost,
    live: false,
  };

}

function getOrderByNumber(orderNumber) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE order_number = ?").get(orderNumber);
  if (!order) return { error: "Order not found", status: 404 };
  return {
    order,
    items: db.prepare("SELECT * FROM oms_order_items WHERE order_id = ?").all(order.id),
    events: db
      .prepare("SELECT * FROM oms_order_events WHERE order_id = ? ORDER BY id DESC")
      .all(order.id),
    fulfillment: db.prepare("SELECT * FROM oms_fulfillment_links WHERE order_id = ?").all(order.id),
  };
}

function listCustomerOrders(customerId) {
  return db
    .prepare(`
      SELECT order_number, channel, currency, grand_total, payment_status, fulfillment_status, order_status, created_at
      FROM oms_orders
      WHERE customer_id = ?
      ORDER BY id DESC
    `)
    .all(customerId);
}

function listOrders(query = {}) {
  const search = query.search || "";
  const status = query.status || "";
  const channel = query.channel || "";
  let sql = "SELECT * FROM oms_orders WHERE 1=1";
  const args = [];

  if (search) {
    sql += " AND (order_number LIKE ? OR customer_email LIKE ?)";
    args.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    sql += " AND order_status = ?";
    args.push(status);
  }
  if (channel) {
    sql += " AND channel = ?";
    args.push(channel);
  }

  sql += " ORDER BY id DESC LIMIT 500";
  return db.prepare(sql).all(...args);
}

function updateOrderStatus(id, body = {}) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };

  return { ok: false, code: "ORDER_UNVERIFIED", status: 409, applied: false, from: order.order_status, requested: body.status || null, live: false };
}

function updatePaymentStatus(id) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };
  return { ok: false, code: "PAYMENT_UNVERIFIED", status: 409, applied: false, live: false };
}

function updateFulfillmentStatus(id) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };
  return { ok: false, code: "FULFILLMENT_NOT_LIVE", status: 409, applied: false, shipped: false, delivered: false, live: false };
}

function cancelOrder(id) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };
  return {
    ok: false,
    code: "CANCELLATION_UNVERIFIED",
    status: 409,
    cancelled: false,
    supplierCancelled: false,
    live: false,
  };
}

function splitOrder(id, body = {}) {
  const parent = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!parent) return { error: "Order not found", status: 404 };

  return {
    ok: false,
    code: "ORDER_UNVERIFIED",
    status: 409,
    orderCreated: false,
    childOrder: null,
    live: false,
  };

}

function addFulfillmentLink(id, body = {}) {
  const order = db.prepare("SELECT id FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };

  return {
    ok: false,
    code: "FULFILLMENT_NOT_LIVE",
    status: 409,
    linked: false,
    shipmentCreated: false,
    live: false,
  };
}

function addOrderNote(id) {
  const order = db.prepare("SELECT id FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404, stored: false, noteSaved: false };
  return { ok: false, code: "ORDER_UNVERIFIED", status: 409, stored: false, noteSaved: false, customerNotified: false, callerFlagIgnored: true };
}

function getOmsOverview() {
  return {
    totalOrders: db.prepare("SELECT COUNT(*) n FROM oms_orders").get().n,
    pending: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'pending'").get().n,
    processing: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'processing'").get().n,
    fulfilled: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'fulfilled'").get().n,
    cancelled: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'cancelled'").get().n,
    grossValue: null,
    revenue: null,
    salesRecorded: false,
    code: "SALES_CLOSED",
  };
}

function getOrderManagementStatus() {
  const overview = getOmsOverview();
  return {
    version: "2.2.0",
    enabled: isEnabled(),
    totals: {
      orders: overview.totalOrders,
      pending: overview.pending,
      processing: overview.processing,
      fulfilled: overview.fulfilled,
      cancelled: overview.cancelled,
      events: db.prepare("SELECT COUNT(*) n FROM oms_order_events").get().n,
      fulfillmentLinks: db.prepare("SELECT COUNT(*) n FROM oms_fulfillment_links").get().n,
      splits: db.prepare("SELECT COUNT(*) n FROM oms_order_splits").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  createOrder,
  getOrderByNumber,
  listCustomerOrders,
  listOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateFulfillmentStatus,
  cancelOrder,
  splitOrder,
  addFulfillmentLink,
  addOrderNote,
  getOmsOverview,
  getOrderManagementStatus,
};
