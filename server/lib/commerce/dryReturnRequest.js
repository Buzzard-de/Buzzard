/**
 * Dry return request. Records the claim only. No money movement.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");
const { evaluateSalesGate } = require("../salesSafetyGate");
const { startReturn } = require("../logistics/v5/returnsEngine");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function createReturnStore({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), `buzzard-dry-rma-${crypto.randomBytes(4).toString("hex")}.sqlite`);
  assertNotGuardian(resolved);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.exec(`
    CREATE TABLE IF NOT EXISTS dry_returns (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return { db, dbPath: resolved };
}

function requestReturn(store, { orderId, reason = "defective", shipmentId } = {}) {
  const sales = evaluateSalesGate();
  if (!orderId) return { ok: false, code: "ORDER_REQUIRED", refundIssued: false, live: false };
  const logistics = startReturn({ shipmentId: shipmentId || orderId });
  const id = `RMA-DRY-${crypto.randomBytes(4).toString("hex")}`;
  const payload = {
    id,
    orderId,
    reason,
    status: "REQUESTED",
    refundIssued: false,
    moneyMovement: false,
    salesGate: sales.status,
    live: false,
    logistics,
  };
  store.db
    .prepare(`INSERT INTO dry_returns(id, order_id, reason, status, payload_json, created_at) VALUES (?,?,?,?,?,?)`)
    .run(id, orderId, reason, payload.status, JSON.stringify(payload), new Date().toISOString());
  return { ok: true, ...payload };
}

function refundMoney() {
  return {
    ok: false,
    code: "REAL_REFUND_BLOCKED",
    refundIssued: false,
    live: false,
    note: "Customer refund stays blocked until live payments exist.",
  };
}

module.exports = { createReturnStore, requestReturn, refundMoney };
