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

function verifyOfficialRequest(input = {}) {
  const base = reviewRequest(input);
  const steps = [
    "RECEIVED",
    "QUARANTINE",
    "IDENTITY_CHECK",
    "LEGAL_REVIEW",
    "SCOPE_MINIMIZATION",
    "AUTHORIZATION",
    "DISCLOSURE_OR_HOLD",
    "AUDIT",
    "CLOSE",
  ];
  const officialChannel = Boolean(input.officialChannelVerified);
  const ipIsNotIdentity = true;
  if (base.code === "PHISHING_SUSPECTED") {
    return { ...base, steps, officialChannel: false, disclosed: false, ipIsNotIdentity };
  }
  if (!officialChannel) {
    return {
      ...base,
      status: "HUMAN_REVIEW",
      code: base.code === "BINDING_ORDER_REVIEW" ? "BINDING_ORDER_REVIEW" : "CHANNEL_UNVERIFIED",
      steps,
      officialChannel: false,
      disclosed: false,
      ipIsNotIdentity,
      note: "Email, IP, ASN or VPN signals are not institution identity.",
    };
  }
  return {
    ok: true,
    status: "HUMAN_REVIEW",
    code: "VERIFIED_CHANNEL_PENDING_LEGAL",
    steps,
    officialChannel: true,
    disclosed: false,
    ipIsNotIdentity,
  };
}

function nationalProcedure({ originCountry = "DE", requestCountry = "DE" } = {}) {
  const origin = String(originCountry || "").toUpperCase();
  const request = String(requestCountry || "").toUpperCase();
  if (origin === "DE" && request === "DE") {
    return { route: "DE_NATIONAL", germanyFederalApprovalAlwaysRequired: false };
  }
  if (origin === "DE" && request !== "DE") {
    return {
      route: "CROSS_BORDER_TO_DE_RECORDS",
      germanyFederalApprovalAlwaysRequired: false,
      note: "Apply the competent German/EU channel for the specific instrument. Do not assume every EU request needs a federal approval stamp.",
    };
  }
  return {
    route: "FOREIGN_COMPETENT_AUTHORITY",
    germanyFederalApprovalAlwaysRequired: false,
    note: "Verify the requesting state's lawful channel. Do not invent a universal rule.",
  };
}

function retentionForSignals() {
  return {
    ipDays: 30,
    asnIsIdentity: false,
    vpnIsIdentity: false,
    torIsIdentity: false,
    purpose: "security_risk_signal_only",
  };
}

module.exports = {
  reviewRequest,
  looksPhish,
  PHISH_HINTS,
  verifyOfficialRequest,
  nationalProcedure,
  retentionForSignals,
};
