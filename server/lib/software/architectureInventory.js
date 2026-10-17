/**
 * Single-orchestrator architecture inventory.
 * Does not activate SoT, sales, or a second orchestrator.
 */

const { CANONICAL_ENGINES } = require("./constants");
const { isSalesEnabled } = require("../salesMode");
const { isProductSourceOfTruthActive } = require("../pim/productWriteBoundary");

function inspect() {
  let sotActive = false;
  try {
    sotActive = isProductSourceOfTruthActive() === true;
  } catch {
    sotActive = false;
  }
  return {
    ok: true,
    liveVerified: false,
    orchestrator: "pusat",
    duplicateOrchestrator: false,
    approvalCenter: "pusat.approval",
    duplicateApprovalCenter: false,
    engines: CANONICAL_ENGINES,
    salesEnabled: isSalesEnabled() === true,
    productSourceOfTruthActive: sotActive,
    livePayments: false,
    note: "Software facade wraps Pusat. It is not a second orchestrator.",
  };
}

function confirmProduction() {
  return {
    ok: false,
    liveVerified: false,
    productionProbed: false,
    reason: "PRODUCTION_ARCHITECTURE_NOT_VERIFIED",
  };
}

module.exports = { inspect, confirmProduction };
