/**
 * Compliance boundaries. Screening does not call an external list.
 * Webhook signatures use a caller-supplied secret. No secret is stored here.
 */
const crypto = require("crypto");
const { screen } = require("../../compliance/sanctionsAdapter");

function scaRequired({ methodId } = {}) {
  const card = methodId === "visa" || methodId === "mastercard" || methodId === "apple_pay" || methodId === "google_pay";
  return {
    required: card,
    method: card ? "3DS_CHALLENGE_REQUIRED" : "NOT_CARD",
    acsUrl: null,
    live: false,
  };
}

function verifyWebhook({ body = "", signature = "", secret = "" } = {}) {
  if (!secret || !signature) return { ok: false, code: "SIGNATURE_MISSING" };
  const digest = crypto.createHmac("sha256", secret).update(String(body)).digest("hex");
  const left = Buffer.from(digest);
  const right = Buffer.from(String(signature));
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return { ok: false, code: "SIGNATURE_MISMATCH" };
  }
  return { ok: true, code: "SIGNATURE_OK", live: false };
}

function screenParty(input = {}) {
  const result = screen(input);
  return { ...result, externalCall: false, moneyMoved: false };
}

function kycBoundary() {
  return {
    ok: false,
    code: "HUMAN_GATE_REQUIRED",
    performsKyc: false,
    storesIdentityDocument: false,
    moneyMoved: false,
  };
}

function monitorTransaction({ amountCents = 0 } = {}) {
  return {
    ok: true,
    code: "RECORDED_FOR_REVIEW",
    amountCents: Number(amountCents) || 0,
    alert: false,
    externalCall: false,
  };
}

module.exports = { scaRequired, verifyWebhook, screenParty, kycBoundary, monitorTransaction };
