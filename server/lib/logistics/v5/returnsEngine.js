/**
 * Returns workflow. A caller shipment id is not a return, and no carrier proof is invented.
 */
const crypto = require("crypto");

const STATES = Object.freeze([
  "RETURN_REQUESTED",
  "RETURN_LABEL_MOCK",
  "CARRIER_COLLECTION_UNKNOWN",
  "IN_TRANSIT_UNKNOWN",
  "WAREHOUSE_OR_SUPPLIER_UNKNOWN",
  "RETURN_DELIVERY_UNCONFIRMED",
  "SUPPLIER_REFUND_NOT_ASSUMED",
  "CUSTOMER_REFUND_NOT_ASSUMED",
  "FINANCIAL_RECONCILIATION_OPEN",
]);

const seenAttempts = new Set();

function attemptKey(input) {
  return crypto.createHash("sha256").update(JSON.stringify({
    shipmentId: String(input.shipmentId || ""),
    orderId: String(input.orderId || ""),
    customerId: String(input.customerId || ""),
  })).digest("hex");
}

function blockedReturn(code, duplicate) {
  return {
    ok: false,
    live: false,
    recorded: false,
    duplicate,
    shipmentId: null,
    orderId: null,
    state: "BLOCKED_EXTERNAL",
    requested: false,
    approved: false,
    received: false,
    labelIssued: false,
    supplierRefundReceived: false,
    customerRefundIssued: false,
    shipmentVerified: false,
    orderVerified: false,
    ownershipVerified: false,
    status: "BLOCKED_EXTERNAL",
    code,
    timeline: STATES.map((state) => ({ state, status: "UNKNOWN" })),
  };
}

function startReturn(input = {}) {
  const key = attemptKey(input);
  if (seenAttempts.has(key)) return blockedReturn("DUPLICATE_RETURN", true);
  seenAttempts.add(key);
  const shipmentId = String(input.shipmentId || "");
  if (input.customerId != null && input.ownerId != null && String(input.customerId) !== String(input.ownerId)) {
    return blockedReturn("OWNERSHIP_UNVERIFIED", false);
  }
  if (/mock|demo|synthetic/i.test(shipmentId)) return blockedReturn("MOCK_NOT_COMMERCIAL", false);
  return blockedReturn(shipmentId ? "SHIPMENT_UNVERIFIED" : "SHIPMENT_UNVERIFIED", false);
}

module.exports = { STATES, startReturn };
