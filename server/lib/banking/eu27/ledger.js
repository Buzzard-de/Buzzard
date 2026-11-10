/**
 * Isolated fiat ledger. Audit rows are append-only.
 * Customer refunds and supplier receivables are separate tables.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");
const { assertNotGuardian } = require("../../pusat/durableTaskQueue");
const { route } = require("./routing");
const { classifySubject } = require("./cardInstrument");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function looksLikeCardNumber(value) {
  return /\b\d{13,19}\b/.test(String(value || ""));
}

function rejectCardData(payload) {
  const stack = [payload];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string" && looksLikeCardNumber(current)) return true;
    if (current && typeof current === "object") stack.push(...Object.values(current));
  }
  return false;
}

function openLedger(dbPath) {
  if (!dbPath) throw new Error("LEDGER_PATH_REQUIRED");
  const resolved = path.resolve(dbPath);
  assertNotGuardian(resolved);
  if (path.basename(resolved) === "buzzard.db") throw new Error("DEV_DB_FORBIDDEN");
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS fiat_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      event TEXT NOT NULL,
      body_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fiat_payments (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE,
      country_code TEXT NOT NULL,
      method_id TEXT NOT NULL,
      currency TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      money_moved INTEGER NOT NULL,
      body_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS customer_refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      money_moved INTEGER NOT NULL,
      body_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS supplier_receivables (
      id TEXT PRIMARY KEY,
      supplier_token TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      assumed_refund INTEGER NOT NULL,
      body_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chargebacks (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      status TEXT NOT NULL,
      money_moved INTEGER NOT NULL,
      body_json TEXT NOT NULL
    );
  `);

  function audit(event, body) {
    db.prepare("INSERT INTO fiat_audit(at, event, body_json) VALUES (?, ?, ?)").run(
      new Date().toISOString(),
      event,
      JSON.stringify(body)
    );
  }

  function submitPayment({
      idempotencyKey,
      countryCode,
      methodId,
      currency,
      amountCents,
      assetType,
      candidates,
      subjectToken,
      sandboxMethodOverride = false,
    } = {}) {
    if (!idempotencyKey) return { ok: false, code: "IDEMPOTENCY_KEY_REQUIRED", moneyMoved: false };
    const subject = classifySubject(subjectToken);
    if (!subject.ok || rejectCardData({ subjectToken, countryCode, methodId, currency })) {
      audit(subject.ok ? "CARD_DATA_REJECTED" : subject.code, { idempotencyKey, stored: false });
      return { ok: false, code: subject.ok ? "CARD_DATA_REJECTED" : subject.code, stored: false, moneyMoved: false };
    }
    const existing = db.prepare("SELECT * FROM fiat_payments WHERE idempotency_key = ?").get(idempotencyKey);
    if (existing) {
      const sameAmount = existing.amount_cents === Number(amountCents || 0) && existing.currency === String(currency || "").toUpperCase();
      if (!sameAmount) {
        return { ok: false, code: "IDEMPOTENCY_CONFLICT", duplicate: true, id: existing.id, moneyMoved: false };
      }
      return { ok: true, duplicate: true, id: existing.id, status: existing.status, moneyMoved: false };
    }
    const decision = route({ countryCode, currency, methodId, assetType, candidates, sandboxMethodOverride });
    if (!decision.ok) {
      audit(decision.code, { idempotencyKey, countryCode, methodId });
      return { ok: false, code: decision.code, moneyMoved: false, duplicate: false };
    }
    const id = `pay_${crypto.randomBytes(6).toString("hex")}`;
    const body = {
      subjectClass: subject.assetClass,
      subjectStored: false,
      provider: decision.provider,
      live: false,
    };
    db.prepare(`
      INSERT INTO fiat_payments(id, idempotency_key, country_code, method_id, currency, amount_cents, status, money_moved, body_json)
      VALUES (?, ?, ?, ?, ?, ?, 'SANDBOX_RECORDED', 0, ?)
    `).run(id, idempotencyKey, String(countryCode).toUpperCase(), methodId, decision.currency || String(currency).toUpperCase(), Number(amountCents) || 0, JSON.stringify(body));
    audit("SANDBOX_RECORDED", { id, idempotencyKey });
    return { ok: true, duplicate: false, id, status: "SANDBOX_RECORDED", moneyMoved: false, live: false };
  }

  function customerRefund({ paymentId, amountCents } = {}) {
    const payment = db.prepare("SELECT * FROM fiat_payments WHERE id = ?").get(paymentId);
    if (!payment) return { ok: false, code: "PAYMENT_NOT_FOUND", moneyMoved: false };
    const id = `rf_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(`
      INSERT INTO customer_refunds(id, payment_id, amount_cents, status, money_moved, body_json)
      VALUES (?, ?, ?, 'SANDBOX_REQUESTED', 0, ?)
    `).run(id, paymentId, Number(amountCents) || 0, JSON.stringify({ supplierAffected: false }));
    audit("CUSTOMER_REFUND_REQUESTED", { id, paymentId });
    return { ok: true, id, status: "SANDBOX_REQUESTED", moneyMoved: false, supplierAffected: false };
  }

  function supplierReceivable({ supplierToken, amountCents } = {}) {
    if (!supplierToken) return { ok: false, code: "SUPPLIER_TOKEN_REQUIRED", moneyMoved: false };
    const id = `ar_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(`
      INSERT INTO supplier_receivables(id, supplier_token, amount_cents, status, assumed_refund, body_json)
      VALUES (?, ?, ?, 'OPEN', 0, '{}')
    `).run(id, supplierToken, Number(amountCents) || 0);
    audit("SUPPLIER_RECEIVABLE_OPENED", { id, supplierToken });
    return { ok: true, id, status: "OPEN", assumedRefund: false, moneyMoved: false };
  }

  function chargeback({ paymentId } = {}) {
    const payment = db.prepare("SELECT * FROM fiat_payments WHERE id = ?").get(paymentId);
    if (!payment) return { ok: false, code: "PAYMENT_NOT_FOUND", moneyMoved: false };
    const id = `cb_${crypto.randomBytes(6).toString("hex")}`;
    db.prepare(`
      INSERT INTO chargebacks(id, payment_id, status, money_moved, body_json)
      VALUES (?, ?, 'OPEN', 0, '{}')
    `).run(id, paymentId);
    audit("CHARGEBACK_OPENED", { id, paymentId });
    return { ok: true, id, status: "OPEN", moneyMoved: false };
  }

  function amendAudit() {
    return { ok: false, code: "AUDIT_IMMUTABLE", applied: false };
  }

  function snapshot() {
    return {
      payments: db.prepare("SELECT id, idempotency_key, status, money_moved, body_json FROM fiat_payments").all(),
      refunds: db.prepare("SELECT id, payment_id, status, money_moved FROM customer_refunds").all(),
      receivables: db.prepare("SELECT id, supplier_token, status, assumed_refund FROM supplier_receivables").all(),
      chargebacks: db.prepare("SELECT id, payment_id, status, money_moved FROM chargebacks").all(),
      auditCount: db.prepare("SELECT COUNT(*) n FROM fiat_audit").get().n,
    };
  }

  function close() {
    db.close();
  }

  return { submitPayment, customerRefund, supplierReceivable, chargeback, amendAudit, snapshot, close, path: resolved };
}

module.exports = { openLedger };
