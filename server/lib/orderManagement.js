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

  const canonical = require("./commerce/orderService").recordCanonicalOrder({
    orderType: "DRY_RUN",
    customerId: body.customerId || body.customer_id || null,
    currency: body.currency || process.env.OMS_DEFAULT_CURRENCY || "EUR",
    subtotal: items.reduce(
      (sum, item) => sum + Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 0),
      0
    ),
    shipping: Number(body.shippingTotal || body.shipping_total || 0),
    discount: Number(body.discountTotal || body.discount_total || 0),
    tax: Number(body.taxTotal || body.tax_total || 0),
    total: Math.max(
      0,
      items.reduce(
        (sum, item) => sum + Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 0),
        0
      ) + Number(body.shippingTotal || body.shipping_total || 0) + Number(body.taxTotal || body.tax_total || 0) - Number(body.discountTotal || body.discount_total || 0)
    ),
    items: items.map((item) => ({
      sku: item.sku || item.product_sku,
      title: item.title || item.name || "",
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.unit_price || 0),
    })),
    idempotencyKey: key ? `oms:${key}` : null,
    channel: "oms",
    payment: { status: "NONE", captured: false, realMoneyMovement: false },
  });
  if (canonical.error || canonical.blocked) {
    return { error: canonical.error || canonical.code, code: canonical.code, status: canonical.status || 400 };
  }

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
    return { order, created: true, canonicalOrderId: canonical.id };
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

function dryCancelFlags() {
  return { realMoneyMovement: false, refundIssued: false, live: false, supplierOrder: false };
}

function moneyBlock(body = {}) {
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  if (body.refund === true || payment.refund === true) return "REFUND_NOT_LIVE";
  if (
    body.capture === true ||
    body.realMoneyMovement === true ||
    payment.captured === true ||
    payment.realMoneyMovement === true
  ) {
    return "PAYMENT_NOT_LIVE";
  }
  return null;
}

function parseCancelQty(value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function toCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function cancelOrderLines(id, body = {}) {
  const flags = dryCancelFlags();
  const money = moneyBlock(body);
  if (money) return { ok: false, code: money, status: 403, ...flags };
  const denied = require("./software/control").guardProjection({
    engine: "order",
    method: "cancelOrderLines",
    actorId: body.actorId,
    actorType: body.actorType,
    table: "oms_order_items",
  });
  if (denied) return { ok: false, code: denied.code, status: denied.status || 403, ...flags };
  const requested = Array.isArray(body.lines) ? body.lines : [];
  if (!requested.length) return { ok: false, code: "LINES_REQUIRED", status: 400, ...flags };

  let outcome = { ok: false, code: "CANCEL_FAILED", status: 500, ...flags };
  db.exec("BEGIN IMMEDIATE");
  try {
    const order = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
    if (!order) outcome = { ok: false, code: "ORDER_NOT_FOUND", status: 404, ...flags };
    else if (["cancelled", "fulfilled"].includes(order.order_status)) {
      outcome = { ok: false, code: "ORDER_NOT_CANCELLABLE", status: 400, ...flags };
    } else {
      const items = db.prepare("SELECT * FROM oms_order_items WHERE order_id = ?").all(order.id);
      const byId = new Map();
      for (const line of requested) {
        const sku = line.sku || line.product_sku || null;
        const matches = items.filter((row) => {
          if (line.itemId != null && line.itemId !== "") return Number(row.id) === Number(line.itemId);
          return Boolean(sku) && row.product_sku === sku;
        });
        if (matches.length === 0) {
          outcome = { ok: false, code: "LINE_NOT_FOUND", status: 404, ...flags };
          break;
        }
        if (matches.length > 1) {
          outcome = { ok: false, code: "LINE_AMBIGUOUS", status: 400, ...flags };
          break;
        }
        const qty = parseCancelQty(line.quantity);
        if (qty == null) {
          outcome = { ok: false, code: "QTY_INVALID", status: 400, ...flags };
          break;
        }
        byId.set(matches[0].id, (byId.get(matches[0].id) || 0) + qty);
      }
      if (!outcome.code || outcome.code === "CANCEL_FAILED") {
        for (const [itemId, qty] of byId) {
          const item = items.find((row) => row.id === itemId);
          const open = Number(item.quantity) - Number(item.cancelled_quantity || 0);
          if (qty > open) {
            outcome = { ok: false, code: "QTY_EXCEEDS_OPEN", status: 400, ...flags };
            break;
          }
        }
      }
      if (!outcome.code || outcome.code === "CANCEL_FAILED") {
        const update = db.prepare(`
          UPDATE oms_order_items
          SET cancelled_quantity = cancelled_quantity + @qty,
              reserved_quantity = MIN(
                CASE WHEN reserved_quantity >= @qty THEN reserved_quantity - @qty ELSE 0 END,
                quantity - (cancelled_quantity + @qty)
              )
          WHERE id = @id AND order_id = @orderId
            AND cancelled_quantity + @qty <= quantity
        `);
        let blocked = false;
        for (const [itemId, qty] of byId) {
          if (update.run({ qty, id: itemId, orderId: order.id }).changes !== 1) {
            blocked = true;
            break;
          }
        }
        if (blocked) outcome = { ok: false, code: "QTY_EXCEEDS_OPEN", status: 409, ...flags };
        else {
          const fresh = db.prepare("SELECT * FROM oms_order_items WHERE order_id = ?").all(order.id);
          let merchandiseCents = 0;
          let taxCents = 0;
          let allCancelled = fresh.length > 0;
          fresh.forEach((item) => {
            const open = Number(item.quantity) - Number(item.cancelled_quantity || 0);
            if (open > 0) allCancelled = false;
            const lineCents = toCents(open * Number(item.unit_price));
            merchandiseCents += lineCents;
            taxCents += Math.round(lineCents * Number(item.tax_rate || 0) / 100);
          });
          const baseCents = toCents(order.subtotal);
          const discountCents = allCancelled || baseCents <= 0
            ? 0
            : Math.min(merchandiseCents, Math.round(toCents(order.discount_total) * merchandiseCents / baseCents));
          const shippingCents = allCancelled ? 0 : toCents(order.shipping_total);
          if (allCancelled) taxCents = 0;
          const grandCents = Math.max(0, merchandiseCents + shippingCents + taxCents - discountCents);
          const nextStatus = allCancelled ? "cancelled" : order.order_status;
          db.prepare(`
            UPDATE oms_orders
            SET subtotal = ?, shipping_total = ?, discount_total = ?, tax_total = ?, grand_total = ?,
                order_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            merchandiseCents / 100,
            shippingCents / 100,
            discountCents / 100,
            taxCents / 100,
            grandCents / 100,
            nextStatus,
            order.id
          );
          recordEvent(order.id, "partial_cancel", order.order_status, nextStatus, body.reason || "Selected lines cancelled", {
            actorId: String(body.actorId).trim(),
            lines: [...byId].map(([itemId, qty]) => ({ itemId, quantity: qty })),
            realMoneyMovement: false,
          });
          outcome = {
            ok: true,
            code: "PARTIAL_CANCELLED",
            status: 200,
            order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(order.id),
            ...flags,
          };
        }
      }
    }
    db.exec(outcome.ok ? "COMMIT" : "ROLLBACK");
  } catch {
    try { db.exec("ROLLBACK"); } catch { /* the transaction is already closed */ }
    outcome = { ok: false, code: "CANCEL_FAILED", status: 500, ...flags };
  }
  return outcome;
}

function splitOrder(id, body = {}) {
  const parent = db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(id);
  if (!parent) return { error: "Order not found", status: 404 };

  const requested = Array.isArray(body.items) ? body.items : [];
  if (!requested.length) return { error: "Split items required", status: 400 };
  const canonical = require("./commerce/orderService").recordCanonicalOrder({
    orderType: "DRY_RUN",
    customerId: parent.customer_id,
    currency: parent.currency,
    subtotal: requested.reduce(
      (sum, item) => sum + Number(item.unitPrice || item.unit_price || 0) * Number(item.quantity || 0),
      0
    ),
    items: requested.map((item) => ({
      sku: item.sku || item.product_sku,
      title: item.title || "",
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.unit_price || 0),
    })),
    idempotencyKey: body.idempotencyKey ? `oms-split:${body.idempotencyKey}` : null,
    channel: "oms_split",
    payment: { status: "NONE", captured: false, realMoneyMovement: false },
  });
  if (canonical.error || canonical.blocked) {
    return { error: canonical.error || canonical.code, code: canonical.code, status: canonical.status || 400 };
  }

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

  return {
    order: db.prepare("SELECT * FROM oms_orders WHERE id = ?").get(result.lastInsertRowid),
    created: true,
    canonicalOrderId: canonical.id,
  };
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
  cancelOrderLines,
  splitOrder,
  addFulfillmentLink,
  addOrderNote,
  getOmsOverview,
  getOrderManagementStatus,
};
