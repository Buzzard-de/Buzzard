/**
 * Customer order confirmation challenge. Dry-run notifications only.
 * GET does not consume the token. Confirmation is not payment proof.
 */

const crypto = require("crypto");
const communications = require("./communications");
const { CONFIRMATION_STATE, NOTIFICATION_STATE } = require("./secureCommerceConstants");
const { newId, sha256Hex, timingEqualHex, writeAudit, parseJson } = require("./secureIds");

const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const COPY = Object.freeze({
  en: {
    subject: "Confirm your Buzzard order {ref}",
    body: "Buzzard has received your order {ref}. For your security, please confirm whether you placed this order using your secure Buzzard account.\n\nIf you did not place this order, do not confirm it. Use the official Buzzard website to contact support.\n\nBuzzard will never ask for your password, full card number, or banking credentials through this message.",
  },
  de: {
    subject: "Bestätigen Sie Ihre Buzzard-Bestellung {ref}",
    body: "Buzzard hat Ihre Bestellung {ref} erhalten. Bitte bestätigen Sie zu Ihrer Sicherheit in Ihrem Buzzard-Konto, ob Sie diese Bestellung aufgegeben haben.\n\nWenn Sie diese Bestellung nicht aufgegeben haben, bestätigen Sie sie nicht. Nutzen Sie die offizielle Buzzard-Website für den Support.\n\nBuzzard fragt in dieser Nachricht niemals nach Passwort, vollständiger Kartennummer oder Bankdaten.",
  },
  tr: {
    subject: "Buzzard siparişinizi onaylayın {ref}",
    body: "Buzzard {ref} numaralı siparişinizi aldı. Güvenliğiniz için bu siparişi sizin verip vermediğinizi Buzzard hesabınızdan onaylayın.\n\nBu siparişi siz vermediyseniz onaylamayın. Destek için resmi Buzzard sitesini kullanın.\n\nBuzzard bu iletiyle asla parolanızı, tam kart numaranızı veya banka bilgilerinizi istemez.",
  },
  ar: {
    subject: "أكد طلب Buzzard {ref}",
    body: "استلم Buzzard طلبك {ref}. لأمانك، أكّد من حساب Buzzard الآمن ما إذا كنت قد قدّمت هذا الطلب.\n\nإذا لم تقدّم هذا الطلب فلا تؤكده. تواصل مع الدعم عبر موقع Buzzard الرسمي.\n\nلن يطلب Buzzard كلمة المرور أو رقم البطاقة الكامل أو بيانات البنك عبر هذه الرسالة.",
  },
});

function messageFor(locale, ref) {
  const key = COPY[locale] ? locale : "en";
  const raw = COPY[key];
  return {
    locale: key,
    fallback: key === "en" && locale && locale !== "en",
    subject: raw.subject.replaceAll("{ref}", ref),
    body: raw.body.replaceAll("{ref}", ref),
  };
}

function createChallenge(db, input = {}) {
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return { ok: false, reason: "ORDER_REQUIRED" };
  const locale = String(input.locale || "de").slice(0, 8);
  const ref = String(input.orderRef || orderId);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + (input.ttlMs || DEFAULT_TTL_MS)).toISOString();
  const copy = messageFor(locale, ref);

  const drafted = communications.draft(db, {
    channel: input.channel || "email",
    customerId: input.customerId,
    orderId,
    locale: copy.locale,
    message: copy.body,
  });

  const id = newId("sconf");
  db.prepare(
    `INSERT INTO software_confirmations(
      id, order_id, token_hash, state, notification_state, channel, locale, expires_at, details_json
    ) VALUES(?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    orderId,
    tokenHash,
    CONFIRMATION_STATE.PENDING,
    drafted.ok ? NOTIFICATION_STATE.PENDING : NOTIFICATION_STATE.FAILED,
    input.channel || "email",
    copy.locale,
    expiresAt,
    JSON.stringify({
      notificationDraftId: drafted.draft?.id || null,
      sent: false,
      delivered: false,
      inventedDelivery: false,
      containsSecrets: false,
    })
  );
  writeAudit(db, "confirmation.create", orderId, { id, locale: copy.locale });

  return {
    ok: true,
    id,
    orderId,
    token,
    tokenHashStored: true,
    rawTokenPersisted: false,
    state: CONFIRMATION_STATE.PENDING,
    notificationState: drafted.ok ? NOTIFICATION_STATE.PENDING : NOTIFICATION_STATE.FAILED,
    sent: false,
    delivered: false,
    message: copy,
    expiresAt,
    confirmationDoesNotProvePayment: true,
  };
}

function getByHash(db, token) {
  return db.prepare("SELECT * FROM software_confirmations WHERE token_hash = ?").get(sha256Hex(token));
}

function previewGet(db, token) {
  const row = getByHash(db, token);
  if (!row) return { ok: false, reason: "INVALID_TOKEN", consumed: false };
  return {
    ok: true,
    consumed: false,
    confirmed: false,
    reason: "CONFIRM_ACTION_REQUIRED",
    state: row.state,
    note: "GET does not confirm. Explicit POST/action required so scanners cannot consume the challenge.",
  };
}

function act(db, input = {}) {
  const token = String(input.token || "");
  const orderId = String(input.orderId || "");
  if (input.method && String(input.method).toUpperCase() === "GET") {
    return previewGet(db, token);
  }
  if (input.confirm !== true && input.reject !== true) {
    return { ok: false, reason: "CONFIRM_ACTION_REQUIRED", consumed: false };
  }

  const row = getByHash(db, token);
  if (!row) return { ok: false, reason: "INVALID_TOKEN", consumed: false };
  if (orderId && row.order_id !== orderId) return { ok: false, reason: "WRONG_ORDER", consumed: false };

  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "RATE_LIMITED", consumed: false };
  }
  db.prepare("UPDATE software_confirmations SET attempts = attempts + 1 WHERE id = ?").run(row.id);

  if (row.used === 1) return { ok: false, reason: "TOKEN_REPLAY", consumed: false };
  if (Date.parse(row.expires_at) <= Date.now()) {
    db.prepare("UPDATE software_confirmations SET state = ? WHERE id = ?").run(CONFIRMATION_STATE.EXPIRED, row.id);
    return { ok: false, reason: "EXPIRED", state: CONFIRMATION_STATE.EXPIRED, consumed: false };
  }

  const next = input.reject === true ? CONFIRMATION_STATE.CUSTOMER_REJECTED : CONFIRMATION_STATE.CUSTOMER_CONFIRMED;
  const updated = db.prepare(
    `UPDATE software_confirmations
     SET state = ?, used = 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND used = 0`
  ).run(next, row.id);
  if (updated.changes !== 1) {
    return { ok: false, reason: "CONCURRENT_OR_REPLAY", consumed: false };
  }
  writeAudit(db, "confirmation.act", row.order_id, { state: next });
  return {
    ok: true,
    state: next,
    consumed: true,
    shipmentAuthorized: false,
    confirmationDoesNotProvePayment: true,
  };
}

function expirePending(db, orderId) {
  db.prepare(
    `UPDATE software_confirmations SET state = ? WHERE order_id = ? AND state = ? AND expires_at <= ?`
  ).run(CONFIRMATION_STATE.EXPIRED, orderId, CONFIRMATION_STATE.PENDING, new Date().toISOString());
}

function currentForOrder(db, orderId) {
  const row = db
    .prepare("SELECT * FROM software_confirmations WHERE order_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(orderId);
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    state: row.state,
    notificationState: row.notification_state,
    sent: parseJson(row.details_json, {}).sent === true,
    delivered: false,
    expiresAt: row.expires_at,
  };
}

function timingSafeHashCheck(token, hash) {
  return timingEqualHex(sha256Hex(token), hash);
}

module.exports = {
  createChallenge,
  previewGet,
  act,
  expirePending,
  currentForOrder,
  messageFor,
  timingSafeHashCheck,
  CONFIRMATION_STATE,
  NOTIFICATION_STATE,
  MAX_ATTEMPTS,
};
