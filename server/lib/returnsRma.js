const crypto = require("crypto");
const { db } = require("./db");

const TRANSITIONS = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["label_sent", "received", "cancelled"],
  label_sent: ["in_transit", "received", "cancelled"],
  in_transit: ["received", "cancelled"],
  received: ["inspecting", "cancelled"],
  inspecting: ["approved_for_refund", "approved_for_exchange", "rejected"],
  approved_for_refund: ["refunded"],
  approved_for_exchange: ["exchanged"],
  refunded: [],
  exchanged: [],
  rejected: [],
  cancelled: [],
};

function isEnabled() {
  return process.env.BUZZARD_RETURNS_RMA !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function rmaNumber() {
  return `RMA-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function warrantyClaimNumber() {
  return `WCL-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function recordEvent(returnId, eventType, oldStatus, newStatus, message = "", meta = {}) {
  db.prepare(`
    INSERT INTO rma_return_events(return_id, event_type, old_status, new_status, message, metadata_json)
    VALUES(?,?,?,?,?,?)
  `).run(returnId, eventType, oldStatus, newStatus, message, JSON.stringify(meta || {}));
}

function createReturn(body = {}) {
  if (!body.orderNumber && !body.order_number) {
    return { error: "Order number and return reason required", status: 400 };
  }
  if (!body.reason) return { error: "Order number and return reason required", status: 400 };

  const result = db
    .prepare(`
      INSERT INTO rma_returns(
        rma_number, order_number, customer_id, customer_email, reason, type, status,
        customer_note, return_address_json, inspection_due_at, refund_amount, warranty_claim
      )
      VALUES(?,?,?,?,?,?,?,?,?,datetime('now','+'||?||' hours'),?,?)
    `)
    .run(
      rmaNumber(),
      body.orderNumber || body.order_number,
      body.customerId || body.customer_id || null,
      body.customerEmail || body.customer_email || "",
      body.reason,
      body.type || "refund",
      "requested",
      body.note || "",
      JSON.stringify(body.returnAddress || body.return_address || {}),
      Number(body.inspectionSlaHours || body.inspection_sla_hours || 48),
      Number(body.refundAmount || body.refund_amount || 0),
      body.warrantyClaim || body.warranty_claim ? 1 : 0
    );

  const insertItem = db.prepare(`
    INSERT INTO rma_return_items(return_id, order_item_id, sku, title, quantity, unit_price)
    VALUES(?,?,?,?,?,?)
  `);
  (body.items || []).forEach((item) => {
    insertItem.run(
      result.lastInsertRowid,
      item.orderItemId || item.order_item_id || null,
      item.sku || "",
      item.title || "",
      Number(item.quantity || 1),
      Number(item.unitPrice || item.unit_price || 0)
    );
  });

  recordEvent(result.lastInsertRowid, "return_created", null, "requested", "Return request created", {
    reason: body.reason,
    type: body.type || "refund",
  });

  return { return: db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(result.lastInsertRowid), created: true };
}

function getReturnByRma(rma) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE rma_number = ?").get(rma);
  if (!row) return { error: "RMA not found", status: 404 };

  return {
    return: row,
    items: db.prepare("SELECT * FROM rma_return_items WHERE return_id = ?").all(row.id),
    events: db
      .prepare("SELECT * FROM rma_return_events WHERE return_id = ? ORDER BY id DESC")
      .all(row.id),
    notes: db.prepare("SELECT * FROM rma_return_notes WHERE return_id = ? ORDER BY id DESC").all(row.id),
    labels: db.prepare("SELECT * FROM rma_return_labels WHERE return_id = ? ORDER BY id DESC").all(row.id),
    warranty: db.prepare("SELECT * FROM rma_warranty_claims WHERE return_id = ?").all(row.id),
  };
}

function updateReturnStatus(id, body = {}) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };

  const next = body.status;
  if (!TRANSITIONS[row.status]?.includes(next)) {
    return { error: `Invalid transition ${row.status} -> ${next}`, status: 400 };
  }

  db.prepare("UPDATE rma_returns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(next, row.id);
  recordEvent(row.id, "status_changed", row.status, next, body.message || "");
  return { return: db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(row.id) };
}

function updateInspection(id, body = {}) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };

  db.prepare("UPDATE rma_returns SET inspection_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    body.status || "passed",
    row.id
  );

  for (const item of body.items || []) {
    db.prepare(`
      UPDATE rma_return_items SET condition = ?, restockable = ?, inspection_note = ?
      WHERE id = ? AND return_id = ?
    `).run(item.condition || "good", item.restockable ? 1 : 0, item.note || "", item.id, row.id);
  }

  recordEvent(row.id, "inspection_updated", row.status, row.status, "Inspection updated", {
    status: body.status || "passed",
  });
  return { ok: true };
}

function createReturnLabel(id, body = {}) {
  const row = db.prepare("SELECT id FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };

  const tracking = body.trackingNumber || body.tracking_number || `DEMO-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
  const result = db
    .prepare(`
      INSERT INTO rma_return_labels(return_id, carrier, service, label_url, tracking_number, status)
      VALUES(?,?,?,?,?,?)
    `)
    .run(row.id, body.carrier || "DHL", body.service || "Retour", body.labelUrl || body.label_url || "", tracking, "ready");

  db.prepare(`
    UPDATE rma_returns SET
      shipping_label_status = 'ready',
      shipping_tracking = ?,
      status = CASE WHEN status = 'approved' THEN 'label_sent' ELSE status END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(tracking, row.id);

  recordEvent(row.id, "return_label_created", null, null, "Return label created", { tracking });
  return { label: db.prepare("SELECT * FROM rma_return_labels WHERE id = ?").get(result.lastInsertRowid), created: true };
}

function processRefund(id, body = {}) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };
  if (!["approved_for_refund", "inspecting", "received"].includes(row.status)) {
    return { error: "RMA is not ready for refund", status: 400 };
  }

  const amount = Number(body.amount || row.refund_amount);
  if (amount <= 0) return { error: "Refund amount required", status: 400 };

  db.prepare(`
    UPDATE rma_returns SET
      refund_status = 'succeeded',
      refund_amount = ?,
      status = 'refunded',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(amount, row.id);

  recordEvent(row.id, "refund_completed", row.status, "refunded", "Refund ready for v2.1 payment execution", {
    amount,
  });

  return {
    ok: true,
    rma: row.rma_number,
    amount,
    next: "execute through v2.1 refund API",
  };
}

function processExchange(id) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };
  if (row.status !== "approved_for_exchange") {
    return { error: "RMA is not approved for exchange", status: 400 };
  }

  const order = `EX-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  db.prepare(`
    UPDATE rma_returns SET exchange_order_number = ?, status = 'exchanged', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(order, row.id);

  recordEvent(row.id, "exchange_created", row.status, "exchanged", "Exchange order boundary created", { order });
  return { ok: true, exchangeOrderNumber: order, next: "create through v2.2 OMS" };
}

function createWarrantyClaim(id, body = {}) {
  const row = db.prepare("SELECT id, status FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };

  const result = db
    .prepare(`
      INSERT INTO rma_warranty_claims(return_id, claim_number, warranty_type, manufacturer, product_sku, description)
      VALUES(?,?,?,?,?,?)
    `)
    .run(
      row.id,
      warrantyClaimNumber(),
      body.warrantyType || body.warranty_type || "manufacturer",
      body.manufacturer || "",
      body.productSku || body.product_sku || "",
      body.description || ""
    );

  db.prepare("UPDATE rma_returns SET warranty_claim = 1 WHERE id = ?").run(row.id);
  recordEvent(row.id, "warranty_claim_created", row.status, row.status, "Warranty claim submitted");

  return { claim: db.prepare("SELECT * FROM rma_warranty_claims WHERE id = ?").get(result.lastInsertRowid), created: true };
}

function addReturnNote(id, body = {}) {
  db.prepare("INSERT INTO rma_return_notes(return_id, note, internal) VALUES(?,?,?)").run(
    id,
    body.note || "",
    body.internal === false ? 0 : 1
  );
  return { ok: true };
}

function listReturns(query = {}) {
  const status = query.status || "";
  const reason = query.reason || "";
  const search = query.search || "";
  let sql = "SELECT * FROM rma_returns WHERE 1=1";
  const args = [];

  if (status) {
    sql += " AND status = ?";
    args.push(status);
  }
  if (reason) {
    sql += " AND reason = ?";
    args.push(reason);
  }
  if (search) {
    sql += " AND (rma_number LIKE ? OR order_number LIKE ? OR customer_email LIKE ?)";
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += " ORDER BY id DESC LIMIT 500";
  return db.prepare(sql).all(...args);
}

function getRmaOverview() {
  return {
    total: db.prepare("SELECT COUNT(*) n FROM rma_returns").get().n,
    requested: db.prepare("SELECT COUNT(*) n FROM rma_returns WHERE status = 'requested'").get().n,
    inTransit: db.prepare("SELECT COUNT(*) n FROM rma_returns WHERE status = 'in_transit'").get().n,
    inspecting: db.prepare("SELECT COUNT(*) n FROM rma_returns WHERE status = 'inspecting'").get().n,
    refunded: db.prepare("SELECT COUNT(*) n FROM rma_returns WHERE status = 'refunded'").get().n,
    refundValue: db
      .prepare("SELECT COALESCE(SUM(refund_amount), 0) n FROM rma_returns WHERE refund_status = 'succeeded'")
      .get().n,
    warranty: db.prepare("SELECT COUNT(*) n FROM rma_returns WHERE warranty_claim = 1").get().n,
  };
}

function getReturnsRmaStatus() {
  const overview = getRmaOverview();
  return {
    version: "2.5.0",
    enabled: isEnabled(),
    totals: {
      returns: overview.total,
      requested: overview.requested,
      inTransit: overview.inTransit,
      inspecting: overview.inspecting,
      refunded: overview.refunded,
      warrantyClaims: db.prepare("SELECT COUNT(*) n FROM rma_warranty_claims").get().n,
      labels: db.prepare("SELECT COUNT(*) n FROM rma_return_labels").get().n,
      events: db.prepare("SELECT COUNT(*) n FROM rma_return_events").get().n,
    },
    overview,
  };
}

module.exports = {
  isEnabled,
  createReturn,
  getReturnByRma,
  updateReturnStatus,
  updateInspection,
  createReturnLabel,
  processRefund,
  processExchange,
  createWarrantyClaim,
  addReturnNote,
  listReturns,
  getRmaOverview,
  getReturnsRmaStatus,
};
