const crypto = require("crypto");
const { db } = require("../../lib/db");

function ensureTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS return_recovery_cases (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE,
      order_id TEXT NOT NULL,
      order_line_id TEXT NOT NULL,
      status TEXT NOT NULL,
      case_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_return_recovery_order_line
      ON return_recovery_cases(order_id, order_line_id);
    CREATE INDEX IF NOT EXISTS idx_return_recovery_status
      ON return_recovery_cases(status);
    CREATE TABLE IF NOT EXISTS return_recovery_idempotency (
      key_hash TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

ensureTables();

function newCaseId() {
  return `rc_${crypto.randomBytes(8).toString("hex")}`;
}

function saveCase(returnCase) {
  const now = new Date().toISOString();
  const payload = { ...returnCase, updatedAt: now };
  db.prepare(`
    INSERT INTO return_recovery_cases(id, idempotency_key, order_id, order_line_id, status, case_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      case_json = excluded.case_json,
      updated_at = excluded.updated_at
  `).run(
    payload.id,
    payload.idempotencyKey || null,
    payload.orderId,
    payload.orderLineId,
    payload.status,
    JSON.stringify(payload),
    payload.createdAt || now,
    now
  );
  return payload;
}

function getCaseById(id) {
  const row = db.prepare("SELECT case_json FROM return_recovery_cases WHERE id = ?").get(id);
  if (!row) return null;
  try {
    return JSON.parse(row.case_json);
  } catch {
    return null;
  }
}

function findByOrderLine(orderId, orderLineId) {
  const row = db
    .prepare("SELECT case_json FROM return_recovery_cases WHERE order_id = ? AND order_line_id = ?")
    .get(orderId, orderLineId);
  if (!row) return null;
  try {
    return JSON.parse(row.case_json);
  } catch {
    return null;
  }
}

function findByIdempotencyKey(key) {
  const row = db
    .prepare("SELECT case_json FROM return_recovery_cases WHERE idempotency_key = ?")
    .get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.case_json);
  } catch {
    return null;
  }
}

function listCases(filter = {}) {
  let rows = db
    .prepare("SELECT case_json FROM return_recovery_cases ORDER BY updated_at DESC")
    .all()
    .map((r) => {
      try {
        return JSON.parse(r.case_json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (filter.status) {
    rows = rows.filter((c) => c.status === filter.status);
  }
  if (filter.pending) {
    rows = rows.filter((c) =>
      [
        "REFUND_PENDING",
        "SUPPLIER_RECOVERY_PENDING",
        "SUPPLIER_CREDIT_PENDING",
        "REQUESTED",
        "APPROVED",
      ].includes(c.status)
    );
  }
  if (filter.supplierRecoveryPending) {
    rows = rows.filter(
      (c) =>
        (c.supplierRecoveryExpected || 0) > (c.supplierRecoveryConfirmed || 0)
    );
  }
  if (filter.unrecovered) {
    rows = rows.filter((c) => (c.unrecoveredAmount || 0) > 0);
  }
  if (filter.liability) {
    rows = rows.filter((c) => c.supplierLiability === filter.liability);
  }

  return rows;
}

function hashIdempotency(scope, key) {
  return crypto.createHash("sha256").update(`${scope}:${key}`).digest("hex");
}

function getIdempotentResponse(scope, key) {
  const keyHash = hashIdempotency(scope, key);
  const row = db
    .prepare("SELECT response_json FROM return_recovery_idempotency WHERE key_hash = ?")
    .get(keyHash);
  if (!row) return null;
  try {
    return JSON.parse(row.response_json);
  } catch {
    return null;
  }
}

function storeIdempotentResponse(scope, key, response) {
  const keyHash = hashIdempotency(scope, key);
  db.prepare(`
    INSERT INTO return_recovery_idempotency(key_hash, scope, response_json)
    VALUES (?, ?, ?)
    ON CONFLICT(key_hash) DO NOTHING
  `).run(keyHash, scope, JSON.stringify(response));
}

function __resetStoreForTests() {
  db.prepare("DELETE FROM return_recovery_cases").run();
  db.prepare("DELETE FROM return_recovery_idempotency").run();
}

module.exports = {
  newCaseId,
  saveCase,
  getCaseById,
  findByOrderLine,
  findByIdempotencyKey,
  listCases,
  getIdempotentResponse,
  storeIdempotentResponse,
  __resetStoreForTests,
};
