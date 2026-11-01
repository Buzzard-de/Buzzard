/**
 * Authority / legal-request screen.
 * Binding orders are not auto-blocked. Phishing and fakes are held.
 */
const PHISH_HINTS = Object.freeze([
  "gift card",
  "verify your password",
  "wire immediately",
  "it-support@",
  "urgent invoice click",
  "reset-login.tk",
]);

function looksPhish({ sender = "", url = "", body = "", claimedAgency = "" } = {}) {
  const blob = `${sender} ${url} ${body} ${claimedAgency}`.toLowerCase();
  return PHISH_HINTS.some((hint) => blob.includes(hint));
}

function reviewRequest(input = {}) {
  const { bindingOrder = false, claimedAgency, documentType } = input;
  if (looksPhish(input)) {
    const esat = require("../security/esatBey").inspect({
      type: "PHISHING_AUTHORITY",
      details: { claimedAgency, documentType },
      actor: "authority_gate",
    });
    return {
      ok: false,
      status: "BLOCKED",
      code: "PHISHING_SUSPECTED",
      humanReview: true,
      obstructLawfulProcess: false,
      esat,
    };
  }
  if (bindingOrder === true) {
    return {
      ok: true,
      status: "HUMAN_REVIEW",
      code: "BINDING_ORDER_REVIEW",
      humanReview: true,
      obstructLawfulProcess: false,
      note: "Do not auto-block a claimed binding order. A human must verify it.",
    };
  }
  return {
    ok: false,
    status: "HUMAN_REVIEW",
    code: "AUTHORITY_UNCERTAIN",
    humanReview: true,
    obstructLawfulProcess: false,
  };
}

module.exports = { reviewRequest, looksPhish, PHISH_HINTS };
