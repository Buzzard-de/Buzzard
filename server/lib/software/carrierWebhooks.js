/**
 * Carrier webhook verification interface and event mapping.
 * Does not invent GPS and does not create live labels.
 */

const crypto = require("crypto");

const CARRIER_MAP = Object.freeze({
  dhl: { signatureHeader: "x-dhl-signature", eventField: "event" },
  dpd: { signatureHeader: "x-dpd-signature", eventField: "event" },
  gls: { signatureHeader: "x-gls-signature", eventField: "event" },
  hermes: { signatureHeader: "x-hermes-signature", eventField: "event" },
  ups: { signatureHeader: "x-ups-signature", eventField: "event" },
});

const EVENT_MAP = Object.freeze({
  pickup: "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  delayed: "DELAYED",
  exception: "EXCEPTION",
  timeout: "EXCEPTION",
  out_for_delivery: "OUT_FOR_DELIVERY",
  delivered: "DELIVERED",
  delivered_signed: "DELIVERED",
  failed: "FAILED_DELIVERY",
  return: "RETURN_TO_SENDER",
});

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyCarrierWebhook(input = {}) {
  const carrier = String(input.carrier || "").toLowerCase();
  const spec = CARRIER_MAP[carrier];
  if (!spec) {
    return { ok: false, verified: false, reason: "CARRIER_UNKNOWN", gpsInvented: false };
  }
  const secret = input.secret || process.env[`${carrier.toUpperCase()}_WEBHOOK_SECRET`];
  if (!secret) {
    return {
      ok: false,
      verified: false,
      reason: "NOT_CONFIGURED",
      carrier,
      gpsInvented: false,
      labelCreated: false,
    };
  }
  const rawBody = String(input.rawBody || "");
  const provided = input.signature || input.headers?.[spec.signatureHeader] || "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!timingSafeEqual(expected, provided)) {
    return { ok: false, verified: false, reason: "INVALID_SIGNATURE", carrier, gpsInvented: false };
  }
  return { ok: true, verified: true, carrier, gpsInvented: false, labelCreated: false };
}

function mapCarrierEvent(input = {}) {
  const raw = String(input.event || input.status || "").toLowerCase();
  const mapped = EVENT_MAP[raw] || "UNKNOWN";
  const signatureEvent = raw === "delivered_signed";
  return {
    status: mapped,
    eventId: input.eventId || input.id || null,
    deliveryEvent: mapped === "DELIVERED",
    signatureProof: signatureEvent,
    locationProof: false,
    gpsInvented: false,
    gps: null,
    simulated: input.simulated === true,
    distinctProofs: {
      delivery: mapped === "DELIVERED",
      signature: signatureEvent,
      location: false,
    },
  };
}

function pollCarrierTracking() {
  return {
    ok: false,
    polled: false,
    live: false,
    liveGps: false,
    gpsInvented: false,
    reason: "CARRIER_POLL_BLOCKED",
    note: "Polling a live carrier API is not executed from this workspace.",
  };
}

function inboundDeliveryWebhook() {
  return {
    ok: false,
    accepted: false,
    live: false,
    labelCreated: false,
    reason: "CARRIER_INBOUND_WEBHOOK_BLOCKED",
  };
}

module.exports = {
  CARRIER_MAP,
  EVENT_MAP,
  verifyCarrierWebhook,
  mapCarrierEvent,
  pollCarrierTracking,
  inboundDeliveryWebhook,
};
