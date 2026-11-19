/**
 * Inbound email sandbox — classify and draft only. No outbound send without approval.
 */
const { classify, draftEmail, handle, INTENTS } = require("./banuDesk");

function verifySender({ from, verifiedCustomerId = null } = {}) {
  const addr = String(from || "").trim().toLowerCase();
  if (!addr || !addr.includes("@")) {
    return { ok: false, code: "SENDER_UNVERIFIED", disclosePii: false };
  }
  if (verifiedCustomerId) {
    return { ok: true, code: "SENDER_VERIFIED", customerId: verifiedCustomerId, disclosePii: true };
  }
  return { ok: false, code: "SENDER_UNVERIFIED", disclosePii: false };
}

function processInboundEmail({ from, subject = "", body = "", locale = "de", verifiedCustomerId = null } = {}) {
  const sender = verifySender({ from, verifiedCustomerId });
  const text = `${subject}\n${body}`.trim();
  const intent = classify(text);
  const desk = handle({
    text,
    locale,
    facts: sender.disclosePii ? { orderId: verifiedCustomerId ? `CUST-${verifiedCustomerId}` : undefined } : {},
  });
  const draft = draftEmail({ locale, intent, facts: desk.verifiedFacts || {} });
  return {
    ok: true,
    live: false,
    autoSent: false,
    sender,
    intent,
    intentsAvailable: INTENTS,
    desk,
    draft,
    escalation: desk.escalated === true || desk.code === "HUMAN_ESCALATION",
    discloseCustomerData: sender.disclosePii,
  };
}

module.exports = { verifySender, processInboundEmail, INTENTS };