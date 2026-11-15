const { db } = require("./db");

function isEnabled() {
  return process.env.BUZZARD_RETURNS_RMA !== "0" && process.env.BUZZARD_DB_ENABLED !== "0";
}

function createReturn() {
  return {
    ok: false,
    error: "RETURN_UNVERIFIED",
    code: "RETURN_UNVERIFIED",
    status: 409,
    created: false,
    stored: false,
    refunded: false,
    live: false,
    callerFlagIgnored: true,
  };
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
  const code = next === "refunded" ? "REFUND_UNVERIFIED" : next === "exchanged" ? "EXCHANGE_NOT_LIVE" : "RETURN_UNVERIFIED";
  return {
    ok: false,
    error: code,
    code,
    status: 409,
    updated: false,
    refunded: false,
    exchanged: false,
    live: false,
    callerFlagIgnored: true,
    currentStatus: row.status,
  };
}

function updateInspection(id) {
  const row = db.prepare("SELECT id FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };
  return {
    ok: false,
    error: "INSPECTION_UNVERIFIED",
    code: "INSPECTION_UNVERIFIED",
    status: 409,
    recorded: false,
    restocked: false,
    refunded: false,
    live: false,
    callerFlagIgnored: true,
  };
}

function createReturnLabel(id) {
  return {
    ok: false,
    live: false,
    mock: false,
    blocked: true,
    status: "BLOCKED_EXTERNAL",
    code: "RETURN_LABEL_NOT_CREATED",
    trackingNumber: null,
    events: [],
    delivered: false,
    label: null,
    created: false,
    id,
  };
}

function processRefund(id) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };
  return {
    ok: false,
    error: "REFUND_UNVERIFIED",
    code: "REFUND_UNVERIFIED",
    status: 409,
    rma: row.rma_number,
    amount: null,
    refunded: false,
    customerRefunded: false,
    supplierCredit: null,
    live: false,
    realMoneyMovement: false,
  };
}

function processExchange(id) {
  const row = db.prepare("SELECT * FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };
  return {
    ok: false,
    error: "EXCHANGE_NOT_LIVE",
    code: "EXCHANGE_NOT_LIVE",
    status: 409,
    exchangeOrderNumber: null,
    exchanged: false,
    live: false,
  };
}

function createWarrantyClaim(id) {
  const row = db.prepare("SELECT id, status FROM rma_returns WHERE id = ?").get(id);
  if (!row) return { error: "RMA not found", status: 404 };
  return {
    ok: false,
    code: "WARRANTY_UNVERIFIED",
    error: "WARRANTY_UNVERIFIED",
    status: 409,
    created: false,
    submitted: false,
    stored: false,
    live: false,
    callerFlagIgnored: true,
  };
}

function addReturnNote() {
  return { ok: false, error: "RETURN_UNVERIFIED", code: "RETURN_UNVERIFIED", status: 409, stored: false };
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
      .prepare("SELECT SUM(refund_amount) n FROM rma_returns WHERE refund_status = 'succeeded'")
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
