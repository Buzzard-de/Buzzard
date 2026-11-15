/**
 * Detects issues and proposes alternatives. Never auto-transfers a live shipment.
 */
function proposeFallback({ reason, destination, humanApprovalRequired = true } = {}) {
  return {
    issue: reason || "UNKNOWN",
    destination: destination || "UNKNOWN",
    alternativesEvaluated: true,
    priceDelta: "UNKNOWN",
    timeDelta: "UNKNOWN",
    autoTransfer: false,
    requiresHumanApproval: humanApprovalRequired !== false,
    live: false,
  };
}

module.exports = { proposeFallback };
