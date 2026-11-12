/**
 * Isolated carrier contracts. Each provider has its own mock protocol.
 * liveShipment stays false. No credentials. No live label purchase.
 */
const crypto = require("crypto");
const { AB27 } = require("../commerce/ab27Tax");

const STATUSES = Object.freeze(["CREATED", "IN_TRANSIT", "DELAYED", "DELIVERED", "FAILED", "LOST", "RETURNING"]);

const POSTCODE = Object.freeze({
  AT: /^\d{4}$/,
  BE: /^\d{4}$/,
  BG: /^\d{4}$/,
  CY: /^\d{4}$/,
  CZ: /^\d{3}\s?\d{2}$/,
  DE: /^\d{5}$/,
  DK: /^\d{4}$/,
  EE: /^\d{5}$/,
  EL: /^\d{3}\s?\d{2}$/,
  ES: /^\d{5}$/,
  FI: /^\d{5}$/,
  FR: /^\d{5}$/,
  HR: /^\d{5}$/,
  HU: /^\d{4}$/,
  IE: /^[A-Z0-9]{3}\s?[A-Z0-9]{4}$/i,
  IT: /^\d{5}$/,
  LT: /^\d{5}$/,
  LU: /^\d{4}$/,
  LV: /^\d{4}$/,
  MT: /^[A-Z]{3}\s?\d{4}$/i,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  PL: /^\d{2}-\d{3}$/,
  PT: /^\d{4}-\d{3}$/,
  RO: /^\d{6}$/,
  SE: /^\d{3}\s?\d{2}$/,
  SI: /^\d{4}$/,
  SK: /^\d{3}\s?\d{2}$/,
});

function brandProfile(id, spec) {
  return {
    id,
    family: spec.family,
    protocol: spec.protocol,
    required: spec.required,
    missingCode: spec.missingCode,
    statusMap: spec.statusMap,
    fixture: spec.fixture,
    failure: spec.failure,
  };
}

const BRAND_PROFILES = Object.freeze({
  DHL: brandProfile("DHL", {
    family: "express",
    protocol: "dhl-bcs-mock",
    required: ["postalCode"],
    missingCode: "DHL_POSTAL_REQUIRED",
    statusMap: { "pre-transit": "CREATED", transit: "IN_TRANSIT", delivered: "DELIVERED", failure: "FAILED", returned: "RETURNING" },
    fixture: { request: { product: "V01PAK", postalCode: "10115" }, response: { shipmentNo: "DHL-MOCK-1" } },
    failure: "DHL_ROUTING_REJECTED",
  }),
  DPD: brandProfile("DPD", {
    family: "parcel",
    protocol: "dpd-parcel-mock",
    required: ["weightGrams"],
    missingCode: "DPD_WEIGHT_REQUIRED",
    statusMap: { "0": "CREATED", "1": "IN_TRANSIT", "2": "DELAYED", "3": "DELIVERED", "4": "FAILED", "5": "RETURNING" },
    fixture: { request: { service: "CL", weightGrams: 500 }, response: { parcelNumber: "DPD-MOCK-1" } },
    failure: "DPD_DEPOT_REJECTED",
  }),
  GLS: brandProfile("GLS", {
    family: "parcel",
    protocol: "gls-shipit-mock",
    required: ["contactName"],
    missingCode: "GLS_CONTACT_REQUIRED",
    statusMap: { PREADVICE: "CREATED", INTRANSIT: "IN_TRANSIT", DELAYED: "DELAYED", DELIVERED: "DELIVERED", FAILED: "FAILED" },
    fixture: { request: { product: "PARCEL", contactName: "A" }, response: { tuNumber: "GLS-MOCK-1" } },
    failure: "GLS_TU_REJECTED",
  }),
  Hermes: brandProfile("Hermes", {
    family: "parcel",
    protocol: "hermes-hsi-mock",
    required: ["houseNumber"],
    missingCode: "HERMES_HOUSENUMBER_REQUIRED",
    statusMap: { ANNOUNCED: "CREATED", ON_THE_WAY: "IN_TRANSIT", DELAYED: "DELAYED", DELIVERED: "DELIVERED" },
    fixture: { request: { houseNumber: "12" }, response: { shipmentId: "HERMES-MOCK-1" } },
    failure: "HERMES_PAN_REJECTED",
  }),
  UPS: brandProfile("UPS", {
    family: "express",
    protocol: "ups-tracking-mock",
    required: ["shipperNumber"],
    missingCode: "UPS_SHIPPER_REQUIRED",
    statusMap: { M: "CREATED", I: "IN_TRANSIT", D: "DELIVERED", X: "FAILED", RS: "RETURNING" },
    fixture: { request: { shipperNumber: "MOCK" }, response: { trackingNumber: "1Z-MOCK" } },
    failure: "UPS_SHIPPER_REJECTED",
  }),
  AmazonLogistics: brandProfile("AmazonLogistics", {
    family: "marketplace",
    protocol: "amazon-swa-mock",
    required: ["amazonOrderId"],
    missingCode: "AMZ_ORDER_REQUIRED",
    statusMap: { READY: "CREATED", OUT_FOR_DELIVERY: "IN_TRANSIT", DELIVERED: "DELIVERED", UNDELIVERABLE: "FAILED" },
    fixture: { request: { amazonOrderId: "AMZ-1" }, response: { trackingId: "TBA-MOCK" } },
    failure: "AMZ_SWA_REJECTED",
  }),
  LocalCourier: brandProfile("LocalCourier", {
    family: "local",
    protocol: "local-courier-mock",
    required: ["phone"],
    missingCode: "LOCAL_PHONE_REQUIRED",
    statusMap: { BOOKED: "CREATED", PICKED_UP: "IN_TRANSIT", AT_DOOR: "IN_TRANSIT", DELIVERED: "DELIVERED", FAILED: "FAILED" },
    fixture: { request: { phone: "+490000" }, response: { courierJob: "LOCAL-MOCK-1" } },
    failure: "LOCAL_ZONE_REJECTED",
  }),
});

function postProfile(cc) {
  return brandProfile(`POST_${cc}`, {
    family: "national-post",
    protocol: `national-post-${cc.toLowerCase()}`,
    required: ["postcode"],
    missingCode: "POST_CODE_REQUIRED",
    statusMap: { POSTED: "CREATED", EN_ROUTE: "IN_TRANSIT", DELAYED: "DELAYED", DELIVERED: "DELIVERED", RETURNED: "RETURNING" },
    fixture: { request: { country: cc, postcode: "00000" }, response: { itemId: `POST-${cc}-MOCK` } },
    failure: `POST_${cc}_REJECTED`,
  });
}

const PROFILES = Object.freeze({
  ...BRAND_PROFILES,
  ...Object.fromEntries(AB27.map((cc) => [`POST_${cc}`, postProfile(cc)])),
});

function normalizeStatus(raw) {
  const u = String(raw || "").toUpperCase();
  if (STATUSES.includes(u)) return u;
  if (u.includes("LOST")) return "LOST";
  if (u.includes("DELAY")) return "DELAYED";
  if (u.includes("RETURN")) return "RETURNING";
  return "CREATED";
}

function mapStatus(profile, raw) {
  const text = String(raw ?? "");
  if (profile.statusMap[text]) return profile.statusMap[text];
  if (profile.statusMap[text.toLowerCase()]) return profile.statusMap[text.toLowerCase()];
  if (profile.statusMap[text.toUpperCase()]) return profile.statusMap[text.toUpperCase()];
  return normalizeStatus(text);
}

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(String(payload)).digest("hex");
}

function validateRequest(profile, req = {}) {
  const address = req.address;
  if (!address) {
    return { ok: false, live: false, mock: false, status: "BLOCKED_EXTERNAL", code: "MISSING_ADDRESS", skipped: true, protocol: profile.protocol };
  }
  for (const field of profile.required) {
    if (address[field] == null || address[field] === "") {
      return { ok: false, code: profile.missingCode, protocol: profile.protocol, field };
    }
  }
  if (profile.id.startsWith("POST_") && address.postcode) {
    const cc = profile.id.slice(5);
    const pattern = POSTCODE[cc];
    if (pattern && !pattern.test(String(address.postcode))) {
      return { ok: false, code: profile.missingCode, protocol: profile.protocol, field: "postcode" };
    }
  }
  if (req.forceFailure === true) {
    return { ok: false, code: profile.failure, protocol: profile.protocol };
  }
  return {
    ok: false,
    live: false,
    mock: false,
    status: "BLOCKED_EXTERNAL",
    code: "LIVE_CONNECTION_REQUIRED",
    shapeAccepted: true,
    validatedAddress: null,
    protocol: profile.protocol,
  };
}

function makeAdapter(id) {
  const profile = PROFILES[id];
  if (!profile) return null;
  const seen = new Set();
  return {
    id,
    protocol: profile.protocol,
    family: profile.family,
    statusMap: { ...profile.statusMap },
    fixture: profile.fixture,
    validateRequest(req) {
      return validateRequest(profile, req);
    },
    createShipment(req = {}) {
      const validation = validateRequest(profile, req);
      if (!validation.ok && validation.shapeAccepted !== true) {
        return {
          ok: false,
          code: validation.code,
          liveShipment: false,
          label: false,
          carrier: id,
          protocol: profile.protocol,
          orderId: req.orderId || null,
        };
      }
      return {
        ok: false,
        code: "HUMAN_GATE_REQUIRED",
        liveShipment: false,
        label: false,
        carrier: id,
        protocol: profile.protocol,
        orderId: req.orderId || null,
        fixture: profile.fixture.response,
      };
    },
    createLabel() {
      return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, carrier: id, protocol: profile.protocol };
    },
    trackShipment({ status = "IN_TRANSIT" } = {}) {
      const mapped = mapStatus(profile, status);
      return {
        ok: false,
        live: false,
        mock: false,
        blocked: true,
        resultStatus: "BLOCKED_EXTERNAL",
        code: "LIVE_CONNECTION_ABSENT",
        liveShipment: false,
        trackingNumber: null,
        carrier: id,
        protocol: profile.protocol,
        status: mapped,
        providerStatus: String(status),
        events: [],
      };
    },
    normalizeStatus: (raw) => mapStatus(profile, raw),
    cancelShipment() {
      return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, carrier: id, protocol: profile.protocol, failure: profile.failure };
    },
    createReturn() {
      return { ok: false, code: "HUMAN_GATE_REQUIRED", liveShipment: false, carrier: id, protocol: profile.protocol };
    },
    verifyWebhook({ payload, header, secret, timestamp } = {}) {
      if (!secret) return { ok: false, code: "WEBHOOK_SECRET_REQUIRED", hmacIsSignature: false, protocol: profile.protocol };
      if (!header) return { ok: false, code: "MISSING_SIGNATURE", hmacIsSignature: false, protocol: profile.protocol };
      if (timestamp && Math.abs(Date.now() - Number(timestamp)) > 300_000) {
        return { ok: false, code: "TIMESTAMP_SKEW", hmacIsSignature: false, protocol: profile.protocol };
      }
      const expected = hmac(secret, payload);
      if (expected !== header) return { ok: false, code: "INVALID_HMAC", hmacIsSignature: false, protocol: profile.protocol };
      if (seen.has(String(payload))) return { ok: false, code: "REPLAY", hmacIsSignature: false, protocol: profile.protocol };
      seen.add(String(payload));
      return {
        ok: false,
        signatureMatched: true,
        hmacIsSignature: false,
        live: false,
        mock: false,
        status: "BLOCKED_EXTERNAL",
        code: "CARRIER_WEBHOOK_UNVERIFIED",
        shipmentCreated: false,
        trackingNumber: null,
        carrier: id,
        protocol: profile.protocol,
      };
    },
    reconcileShipment() {
      return {
        ok: false,
        matched: null,
        live: false,
        mock: false,
        status: "BLOCKED_EXTERNAL",
        code: "LIVE_CONNECTION_ABSENT",
        carrier: id,
        protocol: profile.protocol,
      };
    },
  };
}

const BRANDS = Object.freeze(Object.keys(BRAND_PROFILES));
const POSTS = Object.freeze(AB27.map((cc) => `POST_${cc}`));
const CARRIER_IDS = Object.freeze([...BRANDS, ...POSTS]);
const ADAPTERS = Object.fromEntries(CARRIER_IDS.map((id) => [id, makeAdapter(id)]));

function getAdapter(id) {
  return ADAPTERS[id] || null;
}

function profileOf(id) {
  return PROFILES[id] || null;
}

function snapshot() {
  return {
    carriers: [...CARRIER_IDS],
    protocols: CARRIER_IDS.map((id) => PROFILES[id].protocol),
    live: false,
    credentialsStored: false,
    contract: true,
  };
}

module.exports = {
  STATUSES,
  CARRIER_IDS,
  BRANDS,
  POSTS,
  POSTCODE,
  PROFILES,
  normalizeStatus,
  mapStatus,
  getAdapter,
  profileOf,
  snapshot,
  makeAdapter,
};
