const { getDatabaseHealth } = require("../db");
const { getActiveProvider, isProviderConfigured } = require("../aiProviders");
const { getOrchestratorStatus } = require("../orchestratorBridge");
const { memoryHealth } = require("./memory");
const { remoteStatus } = require("./guardian");
const agents = require("./agents");
const { PUSAT_VERSION } = require("./constants");
const { isSalesEnabled } = require("../salesMode");

async function getHealth() {
  const database = getDatabaseHealth();
  const memory = memoryHealth();
  const remoteGuardian = await remoteStatus();
  const remoteOrchestrator = await getOrchestratorStatus();
  agents.ensureSpecialistEmployees();
  const registry = agents.listAgents();

  const ready =
    !database.error &&
    memory.ok &&
    registry.length >= 9;

  return {
    service: "pusat",
    version: PUSAT_VERSION,
    ready,
    status: ready ? "ready" : "degraded",
    database: {
      ok: !database.error,
      path: database.path,
      persistent: database.persistence?.persistent ?? null,
      ephemeralRisk: database.persistence?.ephemeralRisk ?? null,
      error: database.error || null,
    },
    memory,
    provider: {
      active: getActiveProvider(),
      configured: isProviderConfigured(),
      stub: getActiveProvider() === "stub",
    },
    guardian: {
      local: true,
      remoteConfigured: remoteGuardian.configured,
      remoteReachable: remoteGuardian.reachable,
    },
    remoteOrchestrator: {
      configured: remoteOrchestrator.configured,
      reachable: remoteOrchestrator.reachable,
    },
    agents: registry.map((a) => a.code),
    salesEnabled: isSalesEnabled(),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getHealth };
