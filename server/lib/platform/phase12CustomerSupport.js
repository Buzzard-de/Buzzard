const { processInboundEmail } = require("../customer/incomingEmailProcessor");
const { classify, handle } = require("../customer/banuDesk");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase12CustomerSupport() {
  const intent = classify("Wo ist meine Bestellung?");
  const desk = handle({ text: "Wo ist meine Bestellung?", facts: { orderId: "DRY-ORD-C12" } });
  const inbound = processInboundEmail({
    from: "customer@example.com",
    subject: "Rückgabe",
    body: "Ich möchte zurückgeben",
    headers: {},
  });

  const checks = [
    { id: "CS_CLASSIFY", ok: intent === "order_status" },
    { id: "CS_BANU_HANDLE", ok: desk.ok === true || desk.response != null },
    { id: "CS_INBOUND", ok: inbound.ok === true || inbound.queued === true },
    { id: "CS_LIVE_INBOX", ok: false, status: "BLOCKED_EXTERNAL", note: "Production IMAP/SMTP" },
  ];

  return finalizePhase(12, "Müşteri hizmetleri", checks, ["CS_LIVE_INBOX"]);
}

module.exports = { evaluatePhase12CustomerSupport };