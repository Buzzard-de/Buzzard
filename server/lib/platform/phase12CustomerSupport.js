const { processInboundEmail } = require("../customer/incomingEmailProcessor");
const { classify, handle } = require("../customer/banuDesk");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase12CustomerSupport() {
  const orderIntent = classify("Wo ist meine Bestellung?");
  const wrongIntent = classify("Wie wird das Wetter morgen?");
  const desk = handle({ text: "Wo ist meine Bestellung?", facts: { orderId: "DRY-ORD-C12" } });
  const missingOrder = handle({ text: "Wo ist meine Bestellung?" });
  const emptyDesk = handle({ text: "   " });
  const inbound = processInboundEmail({
    from: "customer@example.com",
    subject: "Rückgabe",
    body: "Ich möchte eine Retoure",
    headers: {},
  });
  const emptyInbound = processInboundEmail({ from: "customer@example.com", subject: " ", body: " " });

  const checks = [
    { id: "CS_CLASSIFY", ok: orderIntent === "order_status" && wrongIntent !== "order_status" },
    {
      id: "CS_BANU_HANDLE",
      ok: desk.ok === true
        && desk.sent === false
        && typeof desk.text === "string"
        && desk.text.length > 0
        && missingOrder.ok === false
        && missingOrder.code === "UNVERIFIED_ORDER"
        && emptyDesk.ok === false
        && emptyDesk.code === "EMPTY_INPUT",
    },
    {
      id: "CS_INBOUND",
      ok: inbound.ok === true
        && inbound.live === false
        && inbound.autoSent === false
        && inbound.intent === "return_status"
        && emptyInbound.ok === false
        && emptyInbound.code === "EMPTY_INPUT",
    },
    { id: "CS_LIVE_INBOX", ok: false, status: "BLOCKED_EXTERNAL", note: "Production IMAP/SMTP" },
  ];

  return {
    ...finalizePhase(12, "Müşteri hizmetleri", checks, ["CS_LIVE_INBOX"]),
    evidence: {
      ok: checks.filter((check) => check.id !== "CS_LIVE_INBOX").every((check) => check.ok),
      orderIntent,
      wrongIntent,
      deskSent: desk.sent,
      missingOrder: missingOrder.code,
      emptyDesk: emptyDesk.code,
      inboundIntent: inbound.intent,
      emptyInbound: emptyInbound.code,
    },
  };
}

module.exports = { evaluatePhase12CustomerSupport };
