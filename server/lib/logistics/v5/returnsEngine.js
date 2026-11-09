/**
 * Returns workflow. Supplier refund is never assumed received.
 */
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

function startReturn({ shipmentId } = {}) {
  return {
    live: false,
    shipmentId: shipmentId || "UNKNOWN",
    state: "RETURN_REQUESTED",
    labelIssued: false,
    supplierRefundReceived: false,
    customerRefundIssued: false,
    timeline: STATES.map((state) => ({ state, status: state === "RETURN_REQUESTED" ? "OPEN" : "UNKNOWN" })),
  };
}

module.exports = { STATES, startReturn };
