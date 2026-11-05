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

module.exports = { requestQuoteTask };
