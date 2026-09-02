/**
 * Part 23 — Multi-supplier registry (extends adapterRegistry, no hard-coded single supplier).
 */
const { listAdapters, getAdapter, registerAdapter } = require("./adapterRegistry");
const { MockSupplierAdapter } = require("./mockAdapter");
const { ApiSupplierAdapter } = require("./apiSupplierAdapter");
const { XmlSupplierAdapter } = require("./xmlSupplierAdapter");
const { CsvSupplierAdapter } = require("./csvSupplierAdapter");
const { createConnectorFromEnv, areCredentialsConfigured } = require("./realSupplierConnector");
const { SUPPLIER_ADAPTER_FORMAT } = require("../../core/supplierIntegrationConstants");
const { evaluateCapabilityMatrix } = require("./supplierCapabilityMatrix");

const SUPPLIER_DEFINITIONS = [
  {
    id: "mock",
    name: "Mock Supplier",
    format: SUPPLIER_ADAPTER_FORMAT.MOCK,
    adapterClass: MockSupplierAdapter,
    credentialsConfigured: false,
    dropshipping: { dropshipping: "UNKNOWN", whiteLabel: "UNKNOWN", blindShipping: "UNKNOWN", customPackaging: "UNKNOWN" },
  },
  {
    id: "api-supplier-dry",
    name: "API Supplier (Dry-Run)",
    format: SUPPLIER_ADAPTER_FORMAT.API,
    adapterClass: ApiSupplierAdapter,
    credentialsConfigured: false,
    dropshipping: { dropshipping: "CONDITION", whiteLabel: "UNKNOWN", blindShipping: "UNKNOWN", customPackaging: "UNKNOWN" },
  },
  {
    id: "xml-supplier-dry",
    name: "XML Feed Supplier (Dry-Run)",
    format: SUPPLIER_ADAPTER_FORMAT.XML,
    adapterClass: XmlSupplierAdapter,
    credentialsConfigured: false,
    dropshipping: { dropshipping: "UNKNOWN", whiteLabel: "UNKNOWN", blindShipping: "UNKNOWN", customPackaging: "UNKNOWN" },
  },
  {
    id: "csv-supplier-dry",
    name: "CSV Feed Supplier (Dry-Run)",
    format: SUPPLIER_ADAPTER_FORMAT.CSV,
    adapterClass: CsvSupplierAdapter,
    credentialsConfigured: false,
    dropshipping: { dropshipping: "UNKNOWN", whiteLabel: "UNKNOWN", blindShipping: "UNKNOWN", customPackaging: "UNKNOWN" },
  },
  {
    id: "REAL-WHOLESALER-001",
    name: "Real Wholesaler (Readiness Placeholder)",
    format: SUPPLIER_ADAPTER_FORMAT.API,
    adapterClass: ApiSupplierAdapter,
    credentialsConfigured: false,
    dropshipping: { dropshipping: "UNKNOWN", whiteLabel: "UNKNOWN", blindShipping: "UNKNOWN", customPackaging: "UNKNOWN" },
  },
];

let initialized = false;

function initRegistry() {
  if (initialized) return;
  for (const def of SUPPLIER_DEFINITIONS) {
    if (def.id === "mock") continue;
    try {
      registerAdapter(new def.adapterClass({
        id: def.id,
        name: def.name,
        credentialsConfigured: def.credentialsConfigured,
      }));
    } catch {
      /* adapter may already exist */
    }
  }
  initialized = true;
}

function resolveCredentialsConfigured(def) {
  if (def.id === "REAL-WHOLESALER-001") {
    return createConnectorFromEnv().getStatus().credentialsConfigured;
  }
  return def.credentialsConfigured;
}

function getSupplierDefinition(id) {
  initRegistry();
  const def = SUPPLIER_DEFINITIONS.find((s) => s.id === id);
  if (!def) return null;
  const credentialsConfigured = resolveCredentialsConfigured(def);
  return {
    ...def,
    credentialsConfigured,
    canGoLive: credentialsConfigured && process.env.REAL_SUPPLIER_LIVE_IMPORT === "1",
    adapterClass: undefined,
  };
}

function listSuppliers() {
  initRegistry();
  return SUPPLIER_DEFINITIONS.map((def) => {
    const credentialsConfigured = resolveCredentialsConfigured(def);
    const capabilities = evaluateCapabilityMatrix({ ...def, credentialsConfigured });
    return {
      id: def.id,
      name: def.name,
      format: def.format,
      credentialsConfigured,
      canGoLive: false,
      liveBlockedReason: credentialsConfigured ? "live_import_disabled" : "credentials_not_configured",
      dropshipping: def.dropshipping,
      capabilities: capabilities.summary,
      ordersEnabled: false,
    };
  });
}

function getSupplierAdapter(id) {
  initRegistry();
  const def = getSupplierDefinition(id);
  if (!def) return null;

  if (def.format === SUPPLIER_ADAPTER_FORMAT.API && def.id === "REAL-WHOLESALER-001") {
    return new ApiSupplierAdapter({
      id: def.id,
      name: def.name,
      credentialsConfigured: def.credentialsConfigured,
    });
  }

  try {
    return getAdapter(id);
  } catch {
    if (def.adapterClass) {
      return new def.adapterClass({
        id: def.id,
        name: def.name,
        credentialsConfigured: def.credentialsConfigured,
      });
    }
    return null;
  }
}

function selectAdapterForFormat(format) {
  initRegistry();
  const normalized = String(format || "").toLowerCase();
  const match = SUPPLIER_DEFINITIONS.find((d) => d.format === normalized);
  return match ? getSupplierAdapter(match.id) : getSupplierAdapter("mock");
}

module.exports = {
  SUPPLIER_DEFINITIONS,
  initRegistry,
  getSupplierDefinition,
  listSuppliers,
  getSupplierAdapter,
  selectAdapterForFormat,
  listLegacyAdapters: listAdapters,
};
