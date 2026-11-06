/**
 * Pusat coordination for logistics tasks. Dry-run only.
 */
const { createTask } = require("../pusat/council");
const { recommend } = require("./selectCarrier");

function requestQuoteTask({ destination, weightKg } = {}) {
  const rec = recommend({ destination, weightKg });
  const task = createTask({
    fromId: "pusat",
    title: `logistics-quote-${destination || "unknown"}`,
    assigneeId: "logistics_ai",
  });
  return {
    ...task,
    recommendation: rec,
    liveShipment: false,
    salesEnabled: false,
  };
}

function requestSelectionHold({ destination, reason } = {}) {
  const task = createTask({
    fromId: "pusat",
    title: `logistics-hold-${destination || "unknown"}`,
    assigneeId: "logistics_ai",
  });
  return {
    ...task,
    status: "HOLD_FOR_REVIEW",
    reason: reason || "NO_VERIFIED_CARRIER",
    liveShipment: false,
    salesEnabled: false,
    customerDeliveryDate: "NOT_PROMISED",
  };
}

module.exports = { requestQuoteTask, requestSelectionHold };
