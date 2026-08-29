const { MockSupplierAdapter } = require("./mockAdapter");

const adapters = new Map();

function registerAdapter(adapter) {
  adapters.set(adapter.id, adapter);
}

function getAdapter(id) {
  if (!adapters.has(id)) {
    if (id === "mock" || !id) {
      registerAdapter(new MockSupplierAdapter());
    }
  }
  const adapter = adapters.get(id || "mock");
  if (!adapter) throw new Error(`Unknown supplier adapter: ${id}`);
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
