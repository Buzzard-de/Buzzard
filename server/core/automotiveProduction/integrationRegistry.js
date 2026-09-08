/**
 * Automotive Production Integration — supplier registry and connector types.
 */
const { getSupplierCredentials } = require("./productionConfig");

const CONNECTOR_TYPES = Object.freeze(["API", "XML", "CSV", "JSON", "SFTP", "REST", "SOAP"]);

const DEFAULT_SUPPLIERS = Object.freeze([
  {
    id: "supplier-example",
    name: "Example Supplier",
    country: "DE",
    type: "API",
    capabilities: {
      products: true,
      stock: true,
      price: true,
      orders: true,
      tracking: true,
      returns: true,
    },
    liveEnabled: false,
    dryRun: true,
  },
  {
    id: "supplier-mock",
    name: "Mock Supplier",
    country: "DE",
    type: "REST",
    capabilities: {
      products: true,
      stock: true,
      price: true,
      orders: false,
      tracking: false,
      returns: false,
    },
    liveEnabled: false,
    dryRun: false,
    mock: true,
  },
]);

const _registry = new Map(DEFAULT_SUPPLIERS.map((s) => [s.id, { ...s }]));

function registerSupplier(definition = {}) {
  if (!definition.id) throw new Error("Supplier id required");
  const entry = {
    ...definition,
    liveEnabled: Boolean(definition.liveEnabled),
    dryRun: definition.dryRun !== false,
    credentials: getSupplierCredentials(definition.id),
  };
  _registry.set(definition.id, entry);
  return entry;
}

function getSupplier(supplierId) {
  return _registry.get(supplierId) || null;
}

function listRegisteredSuppliers() {
  return [..._registry.values()].map((s) => ({
    ...s,
    credentials: getSupplierCredentials(s.id),
  }));
}

function getIntegrationManifest() {
  return {
    name: "Buzzard Automotive Production Integration Layer",
    version: "1.0.0",
    connectorTypes: CONNECTOR_TYPES,
    suppliers: listRegisteredSuppliers().length,
    modes: ["mock", "dry_run", "real_blocked"],
  };
}

module.exports = {
  CONNECTOR_TYPES,
  registerSupplier,
  getSupplier,
  listRegisteredSuppliers,
  getIntegrationManifest,
};
