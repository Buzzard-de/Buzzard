/**
 * Shipping carrier connector registry (sandbox). Live labels stay BLOCKED_EXTERNAL.
 */
const { snapshot: contractSnapshot, CARRIER_IDS, getAdapter } = require("./carrierContract");
const { NETWORKS, NATIONAL_POST, inventory } = require("../commerce/carrierAdapters");

function configuredEnv(carrierId) {
  const key = `CARRIER_${String(carrierId).toUpperCase()}_API_KEY`;
  const v = process.env[key];
  return Boolean(v && String(v).trim().length > 8);
}

function createShippingConnector(carrierId) {
  const adapter = getAdapter(carrierId);
  if (!adapter) return { ok: false, code: "CARRIER_UNKNOWN" };
  return {
    id: carrierId,
    configured: configuredEnv(carrierId),
    live: false,
    liveShipment: false,
    createShipment(payload) {
      return adapter.createShipment(payload);
    },
    trackShipment(payload) {
      return adapter.trackShipment(payload);
    },
    quoteShipment(payload) {
      if (typeof adapter.quoteShipment === "function") return adapter.quoteShipment(payload);
      return { ok: true, dryRun: true, live: false, amount: 0, currency: "EUR" };
    },
  };
}

function snapshot() {
  const contract = contractSnapshot();
  const matrix = inventory();
  return {
    carrierCount: contract.carriers.length,
    brands: CARRIER_IDS,
    networks: NETWORKS.length,
    nationalPosts: Object.keys(NATIONAL_POST).length,
    matrixRows: matrix.length,
    anyLive: false,
    liveShipment: false,
    credentialsStored: contract.credentialsStored,
    connectors: CARRIER_IDS.map((id) => ({
      id,
      configured: configuredEnv(id),
      live: false,
    })),
  };
}

module.exports = { createShippingConnector, snapshot, NETWORKS };