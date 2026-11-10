const { assertConnectorContract } = require("./contracts");
const { createMockConnector } = require("./mockConnector");
const { createAllStubConnectors } = require("./stubConnectors");

function createRegistry(options = {}) {
  const connectors = new Map();

  function register(connector) {
    const contract = assertConnectorContract(connector);
    if (!contract.ok) {
      return { ok: false, issues: contract.missing };
    }
    connectors.set(connector.id, connector);
    return { ok: true, id: connector.id };
  }

  function get(id) {
    return connectors.get(id) || null;
  }

  function list() {
    return [...connectors.values()].map((connector) => ({
      id: connector.id,
      name: connector.name,
      status: connector.status,
      mock: connector.mock,
      liveCalls: false,
      capabilities: connector.capabilities,
      interfaces: connector.interfaces,
      kinds: connector.kinds,
      note: connector.note,
    }));
  }

  if (options.registerDefaults !== false) {
    register(createMockConnector());
    for (const stub of createAllStubConnectors()) register(stub);
  }

  return { register, get, list };
}

module.exports = { createRegistry };
