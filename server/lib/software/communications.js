/**
 * Customer communication preparation. Drafts only — never sends.
 * Wraps pusat.integrations.customerSend.
 */

const crypto = require("crypto");
const { customerSend } = require("../pusat/integrations");

const MESSAGE_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  QUEUED: "QUEUED",
  APPROVED: "APPROVED",
  PROVIDER_ACCEPTED: "PROVIDER_ACCEPTED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  DELIVERY_UNKNOWN: "DELIVERY_UNKNOWN",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
});

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function hashInput(input) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        channel: input.channel || "email",
        customerId: input.customerId || "",
        orderId: input.orderId || "",
        body: String(input.message || input.body || "").trim(),
      })
    )
    .digest("hex");
}

function classifyInquiry(text) {
  const value = String(text || "").toLowerCase();
  if (/track|sendung|kargo|تتبع/.test(value)) return "tracking";
  if (/return|rück|iade|إرجاع/.test(value)) return "returns";
  if (/order|bestell|sipariş|طلب/.test(value)) return "order";
  if (/price|preis|fiyat|سعر/.test(value)) return "pricing";
  return "general";
}

function detectLocale(input = {}) {
  const explicit = String(input.locale || "").trim();
  if (explicit) return explicit;
  const text = String(input.message || input.body || "");
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[ğıüşöçİĞÜŞÖÇ]/.test(text)) return "tr";
  if (/[äöüß]/.test(text)) return "de";
  return "de";
}

function draft(db, input = {}) {
  const body = String(input.message || input.body || "").trim();
  if (!body) {
    return { ok: false, status: MESSAGE_STATUS.FAILED, sent: false, reason: "MESSAGE_REQUIRED" };
  }
  const inputHash = hashInput({ ...input, message: body });
  if (db) {
    const existing = db.prepare("SELECT * FROM software_message_drafts WHERE input_hash = ?").get(inputHash);
    if (existing) {
      return {
        ok: true,
        duplicate: true,
        sent: false,
        status: existing.status,
        draft: existing,
      };
    }
  }

  const classification = classifyInquiry(body);
  const locale = detectLocale({ ...input, message: body });
  const row = {
    id: newId("smsg"),
    channel: input.channel || "email",
    locale,
    customer_id: input.customerId || null,
    order_id: input.orderId || null,
    status: MESSAGE_STATUS.DRAFT,
    input_hash: inputHash,
    body,
    classification,
    sent: 0,
    details_json: JSON.stringify({
      templateValid: true,
      approvalRequired: true,
      inventedSend: false,
    }),
  };

  if (db) {
    db.prepare(
      `INSERT INTO software_message_drafts(
        id, channel, locale, customer_id, order_id, status, input_hash, body, classification, sent, details_json
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      row.id,
      row.channel,
      row.locale,
      row.customer_id,
      row.order_id,
      row.status,
      row.input_hash,
      row.body,
      row.classification,
      row.sent,
      row.details_json
    );
  }

  return {
    ok: true,
    status: MESSAGE_STATUS.DRAFT,
    sent: false,
    delivered: false,
    providerAccepted: false,
    deliveryUnknown: false,
    blocked: false,
    duplicate: false,
    classification,
    locale,
    draft: row,
  };
}

function queue(db, draftId) {
  const row = db.prepare("SELECT * FROM software_message_drafts WHERE id = ?").get(draftId);
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  db.prepare("UPDATE software_message_drafts SET status = ? WHERE id = ?").run(MESSAGE_STATUS.QUEUED, draftId);
  return {
    ok: true,
    status: MESSAGE_STATUS.QUEUED,
    sent: false,
    delivered: false,
    providerAccepted: false,
    deliveryUnknown: false,
    draft: db.prepare("SELECT * FROM software_message_drafts WHERE id = ?").get(draftId),
  };
}

function sendPrepared(db, draftId) {
  const row = db?.prepare("SELECT * FROM software_message_drafts WHERE id = ?").get(draftId);
  const result = customerSend({
    channel: row?.channel || "email",
    message: row?.body || "",
  });
  if (db && row) {
    db.prepare("UPDATE software_message_drafts SET status = ?, sent = 0 WHERE id = ?").run(MESSAGE_STATUS.BLOCKED, draftId);
  }
  return {
    ok: false,
    status: MESSAGE_STATUS.BLOCKED,
    sent: false,
    delivered: false,
    providerAccepted: false,
    deliveryUnknown: false,
    live: false,
    blocked: true,
    reason: result.reason,
    draft: row || null,
  };
}

function consentGate(input = {}) {
  if (input.consentGranted === true) {
    return { ok: true, consentGranted: true, sent: false };
  }
  return {
    ok: false,
    consentGranted: false,
    sent: false,
    reason: "CONSENT_REQUIRED",
  };
}

function humanHandoff(input = {}) {
  return {
    ok: true,
    status: "QUEUED_FOR_HUMAN",
    assigned: false,
    sent: false,
    live: false,
    channel: input.channel || "support",
    customerId: input.customerId || null,
    note: "Handoff is a state record. No customer message is sent.",
  };
}

module.exports = {
  MESSAGE_STATUS,
  classifyInquiry,
  detectLocale,
  draft,
  queue,
  sendPrepared,
  consentGate,
  humanHandoff,
};
