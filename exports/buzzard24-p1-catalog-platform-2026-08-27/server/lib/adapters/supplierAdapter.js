/** Supplier adapter registry (P1-06). Mock/test data only — no real supplier dispatch. */

const mockAdapter = require("./mockSupplierAdapter");
const tecdocAdapter = require("./tecdocAdapter");

const registry = new Map([
  ["mock", mockAdapter],
  ["mock-xml", mockAdapter],
  ["tecdoc", tecdocAdapter],
]);

function getAdapter(adapterId = "mock") {
  return registry.get(adapterId) || mockAdapter;
}

function listAdapters() {
  return Array.from(registry.keys()).map((id) => {
    const adapter = registry.get(id);
    return {
      id,
      name: adapter.name || id,
      capabilities: adapter.capabilities || [],
      mock: adapter.mock !== false,
    };
  });
}

async function fetchCatalog(adapterId, options = {}) {
  const adapter = getAdapter(adapterId);
  return adapter.fetchCatalog(options);
}

async function fetchStock(adapterId, options = {}) {
  const adapter = getAdapter(adapterId);
  return adapter.fetchStock(options);
}

async function fetchPrices(adapterId, options = {}) {
  const adapter = getAdapter(adapterId);
  return adapter.fetchPrices(options);
}

async function prepareOrder(adapterId, orderPayload, options = {}) {
  const adapter = getAdapter(adapterId);
  if (typeof adapter.prepareOrder !== "function") {
    return { ok: false, error: "order_prep_not_supported", mock: true };
  }
  return adapter.prepareOrder(orderPayload, { ...options, dryRun: true });
}

module.exports = {
  getAdapter,
  listAdapters,
  fetchCatalog,
  fetchStock,
  fetchPrices,
  prepareOrder,
};
