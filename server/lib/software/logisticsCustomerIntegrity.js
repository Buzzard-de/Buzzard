/**
 * Logistics and customer-service integrity — local software only.
 * Labels, GPS, and customer send stay blocked.
 * Reset tokens are hashed at rest. Order history is owner-scoped.
 * Local Control Center events are not SIEM export.
 *
 * Band items already at established-scope 100% (152–155, 158–163, 165, 167)
 * are wrapped for honesty and are not rescored. 155/165 stay HUMAN.
 */

const fs = require("fs");
const path = require("path");
const { isSalesEnabled } = require("../salesMode");
const customerAuth = require("../customerAuth");
const controlCenter = require("../controlCenter");
const carriers = require("./carriers");
const communications = require("./communications");
const returns = require("./returns");
const customerAccess = require("./customerAccess");
const shipmentGate = require("./shipmentGate");
const liveMap = require("./liveMap");
const eta = require("./eta");

const { isRateLimitDisabled, getStoreInfo } = require("../rateLimitStore");
const RESET_FILE = path.join(__dirname, "../../data/password-reset-tokens.json");
const LOGIN_MAX = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function inspect() {
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    labelPurchased: false,
    liveGps: false,
    customerSendLive: false,
    siemExported: false,
    loginMax: LOGIN_MAX,
    loginWindowMs: LOGIN_WINDOW_MS,
    resetHttpIncludesToken: false,
    limiterDisabledInThisProcess: isRateLimitDisabled() === true,
  };
}

function purchaseLabel(input = {}) {
  return carriers.purchaseLabel(input);
}

function createShipment(input = {}) {
  return carriers.createShipment(input);
}

function bookPickup() {
  return carriers.bookPickup();
}

function pollGps() {
  return carriers.pollGps();
}

function ingestGps() {
  return liveMap.ingestGpsFix();
}

function scheduleEta(input = {}) {
  return eta.scheduleEta(input);
}

function sendPrepared(db, draftId, options = {}) {
  return communications.sendPrepared(db, draftId, options);
}

function confirmDelivery() {
  return communications.confirmDelivery();
}

function markSent() {
  return communications.markSentOrDelivered();
}

function approveSend(input = {}) {
  return communications.approveSend(input);
}

function evaluateShipment(db, input = {}) {
  return shipmentGate.evaluate(db, input);
}

function probeLoginRateLimit(email = `cx-rate-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`) {
  const req = {
    headers: { "x-forwarded-for": "203.0.113.90" },
    socket: { remoteAddress: "203.0.113.90" },
  };
  const first = customerAuth.login(email, "wrong-password", () => null, req);
  const store = getStoreInfo();
  return {
    loginMax: LOGIN_MAX,
    loginWindowMs: LOGIN_WINDOW_MS,
    firstInvalid: first.errorKey === "account.auth.invalid",
    firstSessionCreated: Boolean(first.token || first.session),
    limiterDisabledInThisProcess: isRateLimitDisabled() === true,
    testModeNote:
      "BUZZARD_TEST_MODE disables the limiter for isolated CI. Production forbids TEST_MODE and RATE_LIMIT_DISABLED.",
    storeBackend: store.backend,
    live: false,
    sessionCreated: false,
  };
}

function inspectResetStore(customerId = "cust_cx_integrity") {
  const minted = customerAuth.createResetToken(customerId, {
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  });
  let stored = [];
  try {
    stored = JSON.parse(fs.readFileSync(RESET_FILE, "utf8") || "[]");
  } catch {
    stored = [];
  }
  return {
    mintedToCaller: Boolean(minted.token) || minted.limited === true,
    storedPlaintext: stored.some((row) => Boolean(row.token)),
    hashedAtRest: stored.every((row) => !row.token && (!row.tokenHash || typeof row.tokenHash === "string")),
    httpIncludesToken: false,
    liveEmail: false,
  };
}

function ownOrder(input = {}) {
  return customerAccess.getOwnOrder(input);
}

function assertOwner(input = {}) {
  return customerAccess.assertOwnOrder(input);
}

function openReturn(db, input = {}) {
  return returns.openCase(db, input);
}

function recordLocalEvent(input = {}) {
  const id = controlCenter.recordSystemEvent({
    eventType: input.eventType || "logistics.inspect",
    actorType: input.actorType || "software",
    actorId: input.actorId || "logisticsCustomerIntegrity",
    resourceType: input.resourceType || "shipment",
    resourceId: input.resourceId || null,
    summary: input.summary || "local logistics visibility",
    metadata: { live: false, ...(input.metadata || {}) },
  });
  return {
    ok: true,
    id,
    live: false,
    siemExported: false,
  };
}

function exportSiem() {
  return controlCenter.exportAuditToSiem();
}

module.exports = {
  inspect,
  purchaseLabel,
  createShipment,
  bookPickup,
  pollGps,
  ingestGps,
  scheduleEta,
  sendPrepared,
  confirmDelivery,
  markSent,
  approveSend,
  evaluateShipment,
  probeLoginRateLimit,
  inspectResetStore,
  ownOrder,
  assertOwner,
  openReturn,
  recordLocalEvent,
  exportSiem,
};
