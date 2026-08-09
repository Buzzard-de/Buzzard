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
    if (existing) return { order: existing };
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return { error: "At least one item is required", status: 400 };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 0),
    0
  );
  const shipping = Number(body.shippingTotal || body.shipping_total || 0);
  const discount = Number(body.discountTotal || body.discount_total || 0);
  const tax = Number(body.taxTotal || body.tax_total || 0);
  const total = Math.max(0, subtotal + shipping + tax - discount);
  const orderNo = body.orderNumber || body.order_number || orderNumber();

  try {
    const result = db
      .prepare(`
        INSERT INTO oms_orders(
          order_number, customer_id, customer_email, channel, currency,
          subtotal, shipping_total, discount_total, tax_total, grand_total,
          payment_status, order_status, shipping_address_json, billing_address_json
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `)
      .run(
        orderNo,
        body.customerId || body.customer_id || null,
        body.customerEmail || body.customer_email || "",
        body.channel || "web",
        body.currency || process.env.OMS_DEFAULT_CURRENCY || "EUR",
        subtotal,
        shipping,
        discount,
        tax,
        total,
        body.paymentStatus || body.payment_status || "pending",
        "pending",
        JSON.stringify(body.shippingAddress || body.shipping_address || {}),
        JSON.stringify(body.billingAddress || body.billing_address || {})
      );

    const insertItem = db.prepare(`
      INSERT INTO oms_order_items(
        order_id, product_sku, title, quantity, unit_price, tax_rate, supplier_id, warehouse_id
      )
      VALUES(?,?,?,?,?,?,?,?)
    `);
    items.forEach((item) => {
      insertItem.run(
        result.lastInsertRowid,
        item.sku || item.product_sku,
        item.title || "",
        Number(item.quantity || 1),
        Number(item.unitPrice || item.unit_price || 0),
        Number(item.taxRate || item.tax_rate || 0),
        item.supplierId || item.supplier_id || null,
        item.warehouseId || item.warehouse_id || null
      );
    });

    if (key) {
      db.prepare("INSERT INTO oms_order_idempotency(idempotency_key, order_id) VALUES(?,?)").run(
        key,
        result.lastInsertRowid
      );
    }

    recordEvent(result.lastInsertRowid, "order_created", null, "pending", "Order created", {
      channel: body.channel || "web",
    });
    const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(result.lastInsertRowid);
    return { order, created: true };
  } catch (error) {
    return { error: "Order creation conflict", detail: error.message, status: 409 };
  }
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

  const next = body.status;
  if (!VALID_TRANSITIONS[order.order_status]?.includes(next)) {
    return { error: `Invalid transition ${order.order_status} -> ${next}`, status: 400 };
  }

  db.prepare("UPDATE oms_orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    next,
    order.id
  );
  recordEvent(order.id, "status_changed", order.order_status, next, body.message || "");
  return { order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(order.id) };
}

function updatePaymentStatus(id, body = {}) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };

  const status = body.status;
  db.prepare("UPDATE oms_orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    status,
    order.id
  );
  recordEvent(order.id, "payment_status_changed", order.payment_status, status, "Payment status updated");
  return { order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(order.id) };
}

function updateFulfillmentStatus(id, body = {}) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };

  const status = body.status;
  db.prepare("UPDATE oms_orders SET fulfillment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    status,
    order.id
  );
  recordEvent(order.id, "fulfillment_status_changed", order.fulfillment_status, status, "Fulfillment status updated");
  return { order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(order.id) };
}

function cancelOrder(id, body = {}) {
  const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };
  if (!["pending", "confirmed", "processing", "partially_fulfilled"].includes(order.order_status)) {
    return { error: "Order cannot be cancelled", status: 400 };
  }

  db.prepare("UPDATE oms_orders SET order_status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    order.id
  );
  recordEvent(order.id, "cancelled", order.order_status, "cancelled", body.reason || "Customer/admin cancellation");
  return { ok: true, order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(order.id) };
}

function splitOrder(id, body = {}) {
  const parent = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!parent) return { error: "Order not found", status: 404 };

  const requested = Array.isArray(body.items) ? body.items : [];
  if (!requested.length) return { error: "Split items required", status: 400 };

  const childNo = orderNumber();
  const result = db
    .prepare(`
      INSERT INTO oms_orders(
        order_number, customer_id, customer_email, channel, currency,
        shipping_total, tax_total, grand_total, payment_status, order_status,
        parent_order_id, shipping_address_json, billing_address_json
      )
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
    .run(
      childNo,
      parent.customer_id,
      parent.customer_email,
      parent.channel,
      parent.currency,
      0,
      0,
      0,
      parent.payment_status,
      "confirmed",
      parent.id,
      parent.shipping_address_json,
      parent.billing_address_json
    );

  let subtotal = 0;
  const add = db.prepare(`
    INSERT INTO oms_order_items(order_id, product_sku, title, quantity, unit_price, tax_rate, supplier_id, warehouse_id)
    VALUES(?,?,?,?,?,?,?,?)
  `);
  requested.forEach((item) => {
    subtotal += Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 0);
    add.run(
      result.lastInsertRowid,
      item.sku || item.product_sku,
      item.title || "",
      Number(item.quantity || 1),
      Number(item.unitPrice || item.unit_price || 0),
      Number(item.taxRate || item.tax_rate || 0),
      item.supplierId || item.supplier_id || null,
      item.warehouseId || item.warehouse_id || null
    );
  });

  db.prepare("UPDATE oms_orders SET subtotal = ?, grand_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    subtotal,
    subtotal,
    result.lastInsertRowid
  );
  db.prepare("INSERT INTO oms_order_splits(parent_order_id, child_order_id, split_reason) VALUES(?,?,?)").run(
    parent.id,
    result.lastInsertRowid,
    body.reason || "fulfillment_split"
  );
  recordEvent(parent.id, "order_split", parent.order_status, parent.order_status, "Child order created", {
    childOrder: childNo,
  });
  recordEvent(result.lastInsertRowid, "order_created", null, "confirmed", "Split child order created", {
    parentOrder: parent.order_number,
  });

  return { order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(result.lastInsertRowid), created: true };
}

function addFulfillmentLink(id, body = {}) {
  const order = db.prepare("SELECT id FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO oms_fulfillment_links(
        order_id, order_item_id, supplier_id, warehouse_id, shipment_id, status, external_reference
      )
      VALUES(?,?,?,?,?,?,?)
    `)
    .run(
      order.id,
      body.orderItemId || body.order_item_id || null,
      body.supplierId || body.supplier_id || null,
      body.warehouseId || body.warehouse_id || null,
      body.shipmentId || body.shipment_id || null,
      body.status || "queued",
      body.externalReference || body.external_reference || ""
    );

  return { link: db.prepare("SELECT * FROM oms_fulfillment_links WHERE id = ?").get(result.lastInsertRowid) };
}

function addOrderNote(id, body = {}) {
  const order = db.prepare("SELECT id FROM oms_orders WHERE id = ?").get(id);
  if (!order) return { error: "Order not found", status: 404 };

  db.prepare("INSERT INTO oms_order_notes(order_id, note, internal) VALUES(?,?,?)").run(
    order.id,
    body.note || "",
    body.internal === false ? 0 : 1
  );
  return { ok: true };
}

function getOmsOverview() {
  return {
    totalOrders: db.prepare("SELECT COUNT(*) n FROM oms_orders").get().n,
    pending: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'pending'").get().n,
    processing: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'processing'").get().n,
    fulfilled: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'fulfilled'").get().n,
    cancelled: db.prepare("SELECT COUNT(*) n FROM oms_orders WHERE order_status = 'cancelled'").get().n,
    grossValue: db
      .prepare("SELECT COALESCE(SUM(grand_total), 0) n FROM oms_orders WHERE order_status <> 'cancelled'")
      .get().n,
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
