/**
 * Fiat banking adapters. Dry-run documents only. No credentials, no transfers.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");

const PROVIDERS = Object.freeze([
  { id: "deutsche_bank_ag", kind: "commercial_bank", candidate: true, live: false },
  { id: "sepa", kind: "rail", live: false },
  { id: "sepa_instant", kind: "rail", live: false },
  { id: "ebics", kind: "protocol", live: false },
  { id: "paypal", kind: "wallet", candidate: true, live: false },
]);

const PAYMENT_STATES = Object.freeze(["CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED", "CANCELLED"]);

function ibanValid(iban) {
  const s = String(iban || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  const expanded = rearranged
    .split("")
    .map((ch) => (/[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch))
    .join("");
  let rest = 0;
  for (let i = 0; i < expanded.length; i += 1) {
    rest = (rest * 10 + Number(expanded[i])) % 97;
  }
  return rest === 1;
}

function pain001({ debtorIban = "DE89370400440532013000", creditorIban = "FR1420041010050500013M02606", amount = "1.00", currency = "EUR" } = {}) {
  const debtorOk = ibanValid(debtorIban);
  const creditorOk = ibanValid(creditorIban);
  const xml = `<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"><CstmrCdtTrfInitn><PmtInf><Amt>${amount}</Amt><Ccy>${currency}</Ccy></PmtInf></Document>`;
  return {
    ok: debtorOk && creditorOk,
    schema: "pain.001.001.03",
    xml,
    live: false,
    submitted: false,
    debtorOk,
    creditorOk,
  };
}

function sepaInstant({ iban, amount } = {}) {
  return { ok: ibanValid(iban), rail: "sepa_instant", amount, live: false, submitted: false };
}

function parseCamt({ xml = "<Stmt><Ntry><Amt Ccy=\"EUR\">1.00</Amt></Ntry></Stmt>" } = {}) {
  const amounts = [...String(xml).matchAll(/<Amt[^>]*>([^<]+)<\/Amt>/g)].map((m) => Number(m[1]));
  return { ok: true, entries: amounts.length, total: amounts.reduce((s, n) => s + n, 0), live: false };
}

function ebicsEnvelope({ orderType = "CCT", payload = "" } = {}) {
  return {
    ok: true,
    orderType,
    hostId: "ISOLATED",
    payloadHash: crypto.createHash("sha256").update(String(payload)).digest("hex"),
    live: false,
    submitted: false,
  };
}

function paypalNvp({ method = "GetTransactionDetails", txn = "SYN-1" } = {}) {
  const body = `METHOD=${encodeURIComponent(method)}&TRANSACTIONID=${encodeURIComponent(txn)}&VERSION=204`;
  return { ok: true, body, live: false, submitted: false };
}

function initiateTransfer(input = {}) {
  const doc = pain001(input);
  return {
    ok: false,
    code: "HUMAN_GATE_REQUIRED",
    sent: false,
    realMoneyMovement: false,
    crypto: false,
    cbdc: false,
    dryRun: doc,
    live: false,
  };
}

function paymentStatus({ from = "CREATED", event = "authorize" } = {}) {
  const transitions = {
    CREATED: { authorize: "AUTHORIZED", fail: "FAILED", cancel: "CANCELLED" },
    AUTHORIZED: { capture: "CAPTURED", fail: "FAILED", refund: "REFUNDED", cancel: "CANCELLED" },
    CAPTURED: { refund: "REFUNDED" },
    FAILED: {},
    REFUNDED: {},
    CANCELLED: {},
  };
  const next = (transitions[from] || {})[event];
  if (!next) return { ok: false, code: "INVALID_TRANSITION", from, event, live: false, moneyMoved: false };
  return { ok: true, from, event, to: next, live: false, moneyMoved: false, states: PAYMENT_STATES };
}

function fraudScreen({ amount, country } = {}) {
  if (amount != null && Number(amount) > 10_000) {
    return { ok: true, decision: "REVIEW", live: false, listLive: false, moneyMoved: false };
  }
  return { ok: true, decision: "PASS_SYNTHETIC", live: false, listLive: false, country: country || null };
}

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function openReplayDb() {
  const dbPath = path.join(os.tmpdir(), "buzzard-pay-webhook.sqlite");
  if (path.basename(dbPath).startsWith("buzzard_guardian")) throw new Error("GUARDIAN_SQLITE_FORBIDDEN");
  const Database = loadSqlite();
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS webhook_seen (event_id TEXT PRIMARY KEY, at TEXT NOT NULL)`);
  return db;
}

function recordEvent(eventId) {
  const db = openReplayDb();
  const existing = db.prepare(`SELECT event_id FROM webhook_seen WHERE event_id = ?`).get(eventId);
  if (existing) {
    db.close();
    return { replay: true };
  }
  db.prepare(`INSERT INTO webhook_seen (event_id, at) VALUES (?,?)`).run(eventId, new Date().toISOString());
  db.close();
  return { replay: false };
}

function reconcile({ statementXml, expected = [] } = {}) {
  const parsed = parseCamt({ xml: statementXml });
  const expectedTotal = (expected || []).reduce((s, n) => s + Number(n), 0);
  const mismatch = expected.length > 0 && Number(expectedTotal.toFixed(2)) !== Number(parsed.total.toFixed(2));
  return { ok: !mismatch, matched: mismatch ? 0 : parsed.entries, mismatch, mode: "DRY_RUN", live: false, parsed };
}

function snapshot() {
  return {
    providers: PROVIDERS.map((p) => ({ ...p })),
    fiatOnly: true,
    cryptoRails: false,
    credentialsStored: false,
    bundesbankIsNotCommercialCandidate: true,
  };
}

module.exports = {
  PROVIDERS,
  PAYMENT_STATES,
  ibanValid,
  pain001,
  sepaInstant,
  parseCamt,
  ebicsEnvelope,
  paypalNvp,
  initiateTransfer,
  paymentStatus,
  fraudScreen,
  recordEvent,
  reconcile,
  snapshot,
};
