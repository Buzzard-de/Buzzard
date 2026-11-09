/**
 * Banu Hanım desk — classifies inquiries; money actions stay gated.
 */
const { reply, refund, HIGH_RISK } = require("../buzzardNative/core/specialists/banuEngine");
const { track } = require("../logistics/carrierAdapter");
const { send } = require("../comms/whatsappSandbox");

const INTENTS = Object.freeze([
  "order_status",
  "tracking",
  "return_status",
  "refund_status",
  "complaint",
  "faq",
]);

function classify(text = "") {
  const t = String(text).toLowerCase();
  if (t.includes("refund") || t.includes("erstatt")) return "refund_status";
  if (t.includes("return") || t.includes("retoure")) return "return_status";
  if (t.includes("track") || t.includes("sendung")) return "tracking";
  if (t.includes("order") || t.includes("bestell")) return "order_status";
  if (t.includes("complaint") || t.includes("beschwer")) return "complaint";
  return "faq";
}

function draftEmail({ locale = "de", intent = "faq", facts = {} } = {}) {
  const handled = handle({ text: intent, locale, facts });
  return {
    ...handled,
    channel: "email_draft",
    sent: false,
    autoSendAuthorized: false,
    body: handled.text || handled.code || "draft_only",
  };
}

function handle({ text, locale = "de", facts = {} } = {}) {
  const intent = classify(text);
  if (intent === "complaint") {
    return {
      ok: true,
      intent,
      escalated: true,
      sent: false,
      locale,
      code: "HUMAN_ESCALATION",
    };
  }
  if (HIGH_RISK.includes(intent) || intent === "refund_status") {
    return { ...refund(), intent, sent: false, whatsapp: send() };
  }
  if (intent === "tracking") {
    const shipment = track();
    return reply({
      actorId: "banu_hanim",
      intent: "tracking",
      locale,
      verifiedFacts: { trackingId: facts.trackingId, answer: shipment.ok ? "events" : "no_live_tracking" },
    });
  }
  return reply({
    actorId: "banu_hanim",
    intent: intent === "faq" ? "order_status" : intent,
    locale,
    verifiedFacts: { orderId: facts.orderId || (intent === "faq" ? "SYN-1" : facts.orderId), answer: "desk_reply" },
  });
}

module.exports = { classify, handle, draftEmail, INTENTS };
