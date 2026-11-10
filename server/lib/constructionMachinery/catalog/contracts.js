const { CONNECTOR_STATUS } = require("../constants");

const CONNECTOR_KINDS = Object.freeze({
  MACHINE_CATALOG: "MachineCatalogConnector",
  PART_CATALOG: "PartCatalogConnector",
  SUPPLIER_INVENTORY: "SupplierInventoryConnector",
  SUPPLIER_PRICING: "SupplierPricingConnector",
  TECHNICAL_DOCUMENT: "TechnicalDocumentConnector",
  COMPATIBILITY_EVIDENCE: "CompatibilityEvidenceProvider",
});

const INTERFACE_KINDS = Object.freeze([
  "REST",
  "GRAPHQL",
  "SOAP",
  "XML",
  "CSV",
  "TSV",
  "JSON",
  "JSONL",
  "SFTP",
  "FTPS",
  "EDI",
  "WEBHOOK",
  "MANUAL_FILE",
  "MOCK",
]);

function describeConnector(definition) {
  return {
    id: definition.id,
    name: definition.name,
    kinds: definition.kinds || [],
    interfaces: definition.interfaces || [],
    capabilities: definition.capabilities || [],
    status: definition.status || CONNECTOR_STATUS.NOT_CONFIGURED,
    mock: Boolean(definition.mock),
    liveCalls: false,
    auth: definition.auth || { mechanism: "none", secretsFromEnv: definition.secretsFromEnv || [] },
    pagination: definition.pagination || null,
    rateLimit: definition.rateLimit || { maxPerMinute: 0 },
    incrementalSync: Boolean(definition.incrementalSync),
    fullSync: Boolean(definition.fullSync),
    retry: definition.retry || { maxAttempts: 2, backoffMs: 200 },
    timeoutMs: definition.timeoutMs || 2000,
    schemaVersion: definition.schemaVersion || "1.0",
    lastSuccessAt: definition.lastSuccessAt || null,
    lastAttemptAt: definition.lastAttemptAt || null,
    freshnessAt: definition.freshnessAt || null,
    license: definition.license || null,
    health: definition.health || "unimplemented",
    note: definition.note || null,
  };
}

function assertConnectorContract(connector) {
  const missing = [];
  for (const field of ["id", "name", "capabilities", "status"]) {
    if (!connector[field] && connector[field] !== false) missing.push(field);
  }
  if (typeof connector.fetchCatalog !== "function") missing.push("fetchCatalog");
  if (typeof connector.healthCheck !== "function") missing.push("healthCheck");
  return { ok: missing.length === 0, missing };
}

module.exports = {
  CONNECTOR_KINDS,
  INTERFACE_KINDS,
  describeConnector,
  assertConnectorContract,
};
