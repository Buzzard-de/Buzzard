const { CONNECTOR_STATUS } = require("../constants");
const { describeConnector, INTERFACE_KINDS } = require("./contracts");

function createStubConnector(interfaceKind) {
  const id = `stub-${String(interfaceKind).toLowerCase()}`;
  const meta = describeConnector({
    id,
    name: `${interfaceKind} construction catalog adapter`,
    kinds: ["PartCatalogConnector", "MachineCatalogConnector"],
    interfaces: [interfaceKind],
    capabilities: ["declared_only"],
    status: CONNECTOR_STATUS.NOT_CONFIGURED,
    mock: false,
    secretsFromEnv: [`BUZZARD_CME_${interfaceKind}_CREDENTIALS`],
    note: "Interface declared. No network calls. Credentials are not present; integration is NOT_CONFIGURED.",
  });

  async function healthCheck() {
    return {
      ok: false,
      status: CONNECTOR_STATUS.NOT_CONFIGURED,
      liveCalls: false,
      reason: "credentials_missing",
    };
  }

  async function fetchCatalog() {
    return {
      ok: false,
      status: CONNECTOR_STATUS.NOT_CONFIGURED,
      liveCalls: false,
      records: null,
      reason: "NOT_CONFIGURED",
    };
  }

  return { ...meta, fetchCatalog, healthCheck };
}

function createAllStubConnectors() {
  return INTERFACE_KINDS.filter((kind) => kind !== "MOCK").map(createStubConnector);
}

module.exports = {
  createStubConnector,
  createAllStubConnectors,
};
