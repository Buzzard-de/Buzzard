const { MockSupplierAdapter } = require("./mockAdapter");
const { UnknownSupplierAdapter } = require("./baseAdapter");

const adapters = new Map();

function registerAdapter(adapter) {
  adapters.set(adapter.id, adapter);
}

function getAdapter(id) {
  if (id === "mock" && !adapters.has("mock")) registerAdapter(new MockSupplierAdapter());
  const adapter = adapters.get(id);
  if (!adapter) return new UnknownSupplierAdapter(id || null);
  return adapter;
}

function listAdapters() {
  if (adapters.size === 0) registerAdapter(new MockSupplierAdapter());
  return [...adapters.values()].map((a) => ({
    id: a.id,
    name: a.name,
    format: a.format,
    capabilities: a.capabilities,
    ordersEnabled: false,
  }));
}

registerAdapter(new MockSupplierAdapter());

module.exports = { registerAdapter, getAdapter, listAdapters };
