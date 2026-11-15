const { check } = require("../permissionEngine");

const HIGH_RISK = ["refund", "cancel", "legal", "gdpr", "account_change", "goodwill", "supplier_finance"];

function reply({ actorId = "banu_hanim", intent, verifiedFacts = {}, locale = "de" } = {}) {
  if (!check(actorId, "CUSTOMER_READ").ok) return { ok: false, code: "PERMISSION_DENIED" };
  if (HIGH_RISK.includes(intent)) {
    return { ok: false, code: "HUMAN_GATE_REQUIRED", action: intent === "refund" ? "CUSTOMER_REFUND" : "ORDER_CANCEL", sent: false };
  }
  if (intent === "order_status" && !verifiedFacts.orderId) {
    return { ok: false, code: "UNVERIFIED_ORDER", guessed: false, sent: false };
  }
  if (intent === "tracking" && !verifiedFacts.trackingId) {
    return { ok: false, code: "UNVERIFIED_TRACKING", guessed: false, sent: false };
  }
  const low = check(actorId, "CUSTOMER_REPLY_LOW_RISK").ok;
  return {
    ok: true,
    locale,
    sent: false,
    policyAutoSend: low && Boolean(verifiedFacts.orderId || verifiedFacts.faqId),
    liveMailbox: false,
    text: verifiedFacts.answer || "verified_policy_reply",
  };
}

function refund() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "CUSTOMER_REFUND" };
}

module.exports = { reply, refund, HIGH_RISK };
