/**
 * Simulated logistics plan. Does not bind Order Engine to live shipments.
 */
const { isSalesEnabled } = require("../../salesMode");
const { selectCarrier } = require("./selectionEngine");

function simulateOrderLogistics({ origin, destination, postalCode, supplierId, weightKg } = {}) {
  const sel = selectCarrier({ origin, destination, postalCode, supplierId, weightKg });
  return {
    live: false,
    salesEnabled: isSalesEnabled(),
    boundToRealOrders: false,
    stockPurchased: false,
    humanApprovalRequired: true,
    steps: [
      "ORDER_RECORDED_MOCK",
      "SUPPLIER_IDENTIFIED_UNKNOWN",
      "STOCK_NOT_PURCHASED",
      "ORIGIN_AND_DEST_CHECKED",
      "CARRIER_AUTOSELECT_BLOCKED_IF_COVERAGE_UNKNOWN",
      "LIVE_SHIPMENT_NOT_STARTED",
    ],
    selection: sel,
    cannotStartShipment: true,
  };
}

module.exports = { simulateOrderLogistics };
