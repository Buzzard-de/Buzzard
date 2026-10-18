/**
 * Partial shipment and multi-supplier plan models.
 * Not bound to live orders and does not send purchase orders.
 */

const crypto = require("crypto");

function newId() {
  return `sfp_${crypto.randomBytes(8).toString("hex")}`;
}

function persist(db, kind, orderId, details) {
  if (!db) return null;
  const id = newId();
  db.prepare(
    `INSERT INTO software_fulfillment_plans(id, order_id, kind, live_bound, sent, details_json)
     VALUES(?,?,?,0,0,?)`
  ).run(id, orderId, kind, JSON.stringify(details));
  return id;
}

function planPartialShipments(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (!orderId) return { ok: false, reason: "ORDER_ID_REQUIRED", liveBound: false, sent: false };
  if (!lines.length) return { ok: false, reason: "LINES_REQUIRED", liveBound: false, sent: false };

  const shipments = lines.map((line, index) => ({
    index,
    sku: line.sku || null,
    quantity: Number(line.quantity || 0),
    supplier: line.supplier || null,
    status: "PLANNED",
    trackingNumber: null,
    labelCreated: false,
  }));

  const details = { shipments, purchaseOrdersSent: false };
  const id = persist(db, "partial_shipment", orderId, details);
  return {
    ok: true,
    id,
    orderId,
    liveBound: false,
    sent: false,
    labelCreated: false,
    shipments,
    note: "Plan only. Not attached to a live customer order.",
  };
}

function planMultiSupplier(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (!orderId) return { ok: false, reason: "ORDER_ID_REQUIRED", liveBound: false, sent: false };

  const bySupplier = new Map();
  for (const line of lines) {
    const supplier = String(line.supplier || "").trim();
    if (!supplier) {
      return { ok: false, reason: "SUPPLIER_REQUIRED", liveBound: false, sent: false };
    }
    const list = bySupplier.get(supplier) || [];
    list.push({ sku: line.sku, quantity: Number(line.quantity || 0) });
    bySupplier.set(supplier, list);
  }

  const purchaseOrders = [...bySupplier.entries()].map(([supplier, items]) => ({
    supplier,
    items,
    status: "DRAFT",
    sent: false,
  }));

  const details = { purchaseOrders, sent: false };
  const id = persist(db, "multi_supplier", orderId, details);
  return {
    ok: true,
    id,
    orderId,
    liveBound: false,
    sent: false,
    purchaseOrders,
    note: "Draft multi-supplier plan. No purchase order is transmitted.",
  };
}

module.exports = {
  planPartialShipments,
  planMultiSupplier,
};
