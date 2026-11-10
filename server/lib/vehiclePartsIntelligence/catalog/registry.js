const { assertConnectorContract } = require("../../constructionMachinery/catalog/contracts");
const { createAllStubConnectors } = require("../../constructionMachinery/catalog/stubConnectors");
const { createMockConnector } = require("./mockConnector");

function createRegistry(options = {}) {
  const connectors = new Map();
  function register(connector) {
    const contract = assertConnectorContract(connector);
    if (!contract.ok) return { ok: false, issues: contract.missing };
    connectors.set(connector.id, connector);
    return { ok: true, id: connector.id };
  }
  if (options.registerDefaults !== false) {
    register(createMockConnector());
    for (const stub of createAllStubConnectors()) {
      register({ ...stub, id: `vpe-${stub.id}`, name: `Vehicle ${stub.name}`, note: "Vehicle catalog stub. NOT_CONFIGURED." });
    }
  }
  return {
    register,
    get: (id) => connectors.get(id) || null,
    list: () =>
      [...connectors.values()].map((connector) => ({
        id: connector.id,
        name: connector.name,
        status: connector.status,
        mock: connector.mock,
        liveCalls: false,
        domain: "automotive",
        note: connector.note,
      })),
  };
}

module.exports = { createRegistry };
