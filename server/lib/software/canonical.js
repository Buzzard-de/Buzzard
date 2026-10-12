/**
 * Single registry of canonical engines. Does not create a second orchestrator.
 */

const { CANONICAL_ENGINES, SOFTWARE_VERSION } = require("./constants");
const { MARKET_UNDERCUT_IMPLEMENTED } = require("../pusat/constants");
const { isSalesEnabled } = require("../salesMode");

function getCanonicalMap() {
  return {
    version: SOFTWARE_VERSION,
    salesEnabled: isSalesEnabled(),
    productSourceOfTruthActive: false,
    marketUndercutImplemented: MARKET_UNDERCUT_IMPLEMENTED,
    engines: { ...CANONICAL_ENGINES },
    conflicts: [
      {
        topic: "pricing",
        canonical: CANONICAL_ENGINES.pricing,
        other: "intelligence Python MIN_NET_PROFIT=0.50 policy",
        resolution: "Node pricing.js is canonical for storefront/Pusat. Python policy is documented, not silently merged. €0.10 undercut is not implemented.",
      },
      {
        topic: "product_create",
        canonical: CANONICAL_ENGINES.productCreate,
        other: "orderManagement.createOrder / dbOrders / p1CatalogPlatform",
        resolution: "Authorized product write policy is productWriteBoundary; persistence for that engine remains productCore.createProduct → pim_core_products. Other stores stay independent. Dual-write is forbidden. Product SoT stays inactive.",
      },
      {
        topic: "orchestrator",
        canonical: CANONICAL_ENGINES.orchestrator,
        other: "aiOrchestrator / controlCenter / jobQueue",
        resolution: "Pusat is the facade. Existing modules remain; they are not a second orchestrator.",
      },
    ],
  };
}

function assertCanonicalOrchestrator() {
  if (CANONICAL_ENGINES.orchestrator !== "pusat") {
    throw new Error("Canonical orchestrator must remain Pusat");
  }
  return true;
}

module.exports = {
  getCanonicalMap,
  assertCanonicalOrchestrator,
};
