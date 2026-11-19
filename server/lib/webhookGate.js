/**
 * Admission of inbound webhooks.
 *
 * A webhook route changes payment, payout, dispute, marketplace-order or
 * shipment state without a user session, so every request has to prove where
 * it comes from:
 *
 *   X-Buzzard-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>
 *
 * - The secret is per scope (BUZZARD_WEBHOOK_SECRET_<SCOPE>), at least 32
 *   characters. A scope without a secret refuses every request.
 * - The timestamp has to be within five minutes of the server clock.
 * - A signed request is accepted once; the same signed request again is a replay.
 * - An event that was already processed is acknowledged without running the
 *   handler again, also when it arrives with a fresh signature (provider retry).
 */
const crypto = require("crypto");

const SIGNATURE_HEADER = "x-buzzard-signature";
const EVENT_ID_HEADERS = ["x-buzzard-event-id", "x-event-id"];
const TOLERANCE_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;
const EVENT_RETENTION_SECONDS = 30 * 24 * 60 * 60;
const IN_FLIGHT_SECONDS = 60;
const MAX_FAILURES_PER_MINUTE = 30;
const MAX_FAILURE_KEYS = 5000;

const SCOPES = Object.freeze({
  payment: "BUZZARD_WEBHOOK_SECRET_PAYMENT",
  payout: "BUZZARD_WEBHOOK_SECRET_PAYOUT",
  dispute: "BUZZARD_WEBHOOK_SECRET_DISPUTE",
  marketplace: "BUZZARD_WEBHOOK_SECRET_MARKETPLACE",
  carrier: "BUZZARD_WEBHOOK_SECRET_CARRIER",
  commerce: "BUZZARD_WEBHOOK_SECRET_COMMERCE",
  provider: "BUZZARD_WEBHOOK_SECRET_PROVIDER",
});

const PLACEHOLDER = /^(change[-_ ]?me|secret|test|example|placeholder|whsec_?x*|x+|0+|1234567890.*)$/i;

function usableSecret(value) {
  if (typeof value !== "string") return null;
  const secret = value.trim();
  if (secret.length < MIN_SECRET_LENGTH) return null;
  if (PLACEHOLDER.test(secret) || new Set(secret).size < 8) return null;
  return secret;
}

/** Current secret first, then the previous one while a rotation is in progress. */
function secretsFor(scope) {
  const name = SCOPES[scope];
  if (!name) return [];
  return [usableSecret(process.env[name]), usableSecret(process.env[`${name}_PREVIOUS`])].filter(Boolean);
}

function describeConfiguration() {
  return Object.entries(SCOPES).map(([scope, variable]) => {
    const raw = process.env[variable];
    const set = typeof raw === "string" && raw.trim().length > 0;
    return { scope, variable, configured: secretsFor(scope).length > 0, rejected: set && !usableSecret(raw) };
  });
}

function sign(secret, timestamp, rawBody) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
}

/** Builds the header value for a payload. Used by tests and by a relay that forwards provider events. */
function signatureHeader(secret, rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ""), "utf8");
  return `t=${timestamp},v1=${sign(secret, timestamp, body)}`;
}

const HEADER_PATTERN = /^t=(\d{1,12}),v1=([a-f0-9]{64})$/;

function parseSignature(value) {
  if (typeof value !== "string" || value.length > 120) return null;
  const match = HEADER_PATTERN.exec(value);
  if (!match) return null;
  const timestamp = Number(match[1]);
  if (!Number.isSafeInteger(timestamp)) return null;
  return { timestamp, signature: match[2] };
}

function matches(expectedHex, givenHex) {
  const expected = Buffer.from(expectedHex, "hex");
  const given = Buffer.from(givenHex, "hex");
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function eventIdOf(req, rawBody) {
  const candidates = [];
  for (const header of EVENT_ID_HEADERS) candidates.push(req.headers?.[header]);
  const body = req.body && typeof req.body === "object" ? req.body : {};
  candidates.push(body.eventId, body.event_id, body.id);
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return `id:${candidate}`;
    if (typeof candidate === "string" && /^[\x21-\x7e]{1,128}$/.test(candidate)) return `id:${candidate}`;
  }
  // No id from the sender: the payload itself identifies the event.
  return `body:${crypto.createHash("sha256").update(rawBody).digest("hex")}`;
}

/* ---- receipts ---------------------------------------------------------- */

let receiptsReady = false;

function receipts() {
  const { db } = require("./db");
  if (!receiptsReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('signature', 'event')),
        value TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'received',
        received_at INTEGER NOT NULL,
        UNIQUE(scope, kind, value)
      );
    `);
    receiptsReady = true;
  }
  return db;
}

function prune(db, now) {
  db.prepare("DELETE FROM webhook_receipts WHERE kind = 'signature' AND received_at < ?").run(now - 2 * TOLERANCE_SECONDS);
  db.prepare("DELETE FROM webhook_receipts WHERE kind = 'event' AND received_at < ?").run(now - EVENT_RETENTION_SECONDS);
}

/* ---- failures per address --------------------------------------------- */

const failures = new Map();

function limiterOff() {
  return require("./rateLimitStore").isRateLimitDisabled();
}

function recentFailures(address, nowMs) {
  const list = (failures.get(address) || []).filter((at) => nowMs - at < 60_000);
  if (list.length) failures.set(address, list);
  else failures.delete(address);
  return list;
}

function noteFailure(address, nowMs) {
  const list = recentFailures(address, nowMs);
  list.push(nowMs);
  failures.delete(address);
  failures.set(address, list);
  while (failures.size > MAX_FAILURE_KEYS) failures.delete(failures.keys().next().value);
}

/* ---- admission --------------------------------------------------------- */

function refuse(status, errorKey, reason) {
  return { ok: false, status, errorKey, reason };
}

/**
 * Decides whether the handler may run.
 * Returns { ok: false, status, errorKey, reason }
 *      or { ok: true, duplicate: true, eventId }
 *      or { ok: true, scope, eventId, timestamp, receiptId }.
 */
function admit(req, scope, { now = Date.now() } = {}) {
  const { getClientIp } = require("./security");
  const address = getClientIp(req) || "unknown";
  const limited = !limiterOff();
  if (limited && recentFailures(address, now).length >= MAX_FAILURES_PER_MINUTE) {
    return refuse(429, "security.rateLimited", "too_many_failures");
  }
  const fail = (status, errorKey, reason) => {
    if (limited) noteFailure(address, now);
    return refuse(status, errorKey, reason);
  };

  const secrets = secretsFor(scope);
  if (secrets.length === 0) return fail(503, "webhook.notConfigured", "not_configured");

  const header = req.headers?.[SIGNATURE_HEADER];
  if (header === undefined || header === "") return fail(401, "webhook.signatureRequired", "missing_signature");
  const parsed = parseSignature(Array.isArray(header) ? null : header);
  if (!parsed) return fail(401, "webhook.signatureInvalid", "malformed_signature");

  const nowSeconds = Math.floor(now / 1000);
  if (Math.abs(nowSeconds - parsed.timestamp) > TOLERANCE_SECONDS) {
    return fail(401, "webhook.timestampOutOfRange", "timestamp_out_of_range");
  }

  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.alloc(0);
  // Every configured secret is checked so the time taken does not tell which one matched.
  let authentic = false;
  for (const secret of secrets) {
    if (matches(sign(secret, parsed.timestamp, rawBody), parsed.signature)) authentic = true;
  }
  if (!authentic) return fail(401, "webhook.signatureInvalid", "bad_signature");

  let db;
  try {
    db = receipts();
  } catch {
    // Without the receipt store a replay could not be recognised.
    return refuse(503, "webhook.unavailable", "receipt_store_unavailable");
  }

  const eventId = eventIdOf(req, rawBody);
  const verdict = db.transaction(() => {
    prune(db, nowSeconds);
    try {
      db.prepare("INSERT INTO webhook_receipts(scope, kind, value, status, received_at) VALUES(?, 'signature', ?, 'seen', ?)").run(
        scope,
        parsed.signature,
        nowSeconds
      );
    } catch (error) {
      if (String(error.code || "").startsWith("SQLITE_CONSTRAINT")) return refuse(409, "webhook.replayed", "replay");
      throw error;
    }

    const known = db.prepare("SELECT id, status, received_at FROM webhook_receipts WHERE scope = ? AND kind = 'event' AND value = ?").get(scope, eventId);
    if (known && known.status === "processed") return { ok: true, duplicate: true, eventId };
    if (known && nowSeconds - known.received_at <= IN_FLIGHT_SECONDS) {
      return refuse(409, "webhook.eventInProgress", "event_in_progress");
    }
    if (known) {
      db.prepare("UPDATE webhook_receipts SET status = 'received', received_at = ? WHERE id = ?").run(nowSeconds, known.id);
      return { ok: true, scope, eventId, timestamp: parsed.timestamp, receiptId: known.id };
    }
    const inserted = db
      .prepare("INSERT INTO webhook_receipts(scope, kind, value, status, received_at) VALUES(?, 'event', ?, 'received', ?)")
      .run(scope, eventId, nowSeconds);
    return { ok: true, scope, eventId, timestamp: parsed.timestamp, receiptId: Number(inserted.lastInsertRowid) };
  })();

  // A replay is a rejected request like any other.
  if (!verdict.ok && limited) noteFailure(address, now);
  return verdict;
}

/**
 * Called when the response is finished. Only a 2xx answer marks the event as
 * processed; anything else frees the event id so the sender's retry runs the
 * handler again.
 */
function settle(receiptId, statusCode) {
  if (!receiptId) return;
  try {
    const db = receipts();
    if (statusCode >= 200 && statusCode < 300) {
      db.prepare("UPDATE webhook_receipts SET status = 'processed' WHERE id = ? AND kind = 'event'").run(receiptId);
    } else {
      db.prepare("DELETE FROM webhook_receipts WHERE id = ? AND kind = 'event' AND status = 'received'").run(receiptId);
    }
  } catch (error) {
    console.error("[webhook] receipt could not be settled:", error && error.code);
  }
}

function resetForTests() {
  failures.clear();
  receiptsReady = false;
}

module.exports = {
  SCOPES,
  SIGNATURE_HEADER,
  TOLERANCE_SECONDS,
  MIN_SECRET_LENGTH,
  MAX_FAILURES_PER_MINUTE,
  admit,
  settle,
  signatureHeader,
  parseSignature,
  secretsFor,
  describeConfiguration,
  resetForTests,
};
