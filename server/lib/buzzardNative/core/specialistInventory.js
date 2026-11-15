const { ids, getAgent, SEED_IDS } = require("./identityRegistry");
const { check } = require("./permissionEngine");
const { executiveSize } = require("./councilConfig");

const REQUIRED = Object.freeze([
  "agent_id",
  "display_name",
  "role",
  "memory_namespace",
  "permission_profile",
]);

function inventory() {
  const agents = ids().map((id) => getAgent(id));
  const missing = [];
  for (const a of agents) {
    for (const k of REQUIRED) {
      if (!a[k]) missing.push({ id: a.agent_id, field: k });
    }
    if (!a.memory_namespace || !String(a.memory_namespace).startsWith("memory/")) {
      missing.push({ id: a.agent_id, field: "memory_namespace" });
    }
  }
  return {
    count: agents.length,
    seed: SEED_IDS.length,
    llmCouncil: false,
    executive: executiveSize(),
    missing,
    names: agents.map((a) => a.display_name),
    namespaces: agents.map((a) => a.memory_namespace),
    uniqueNamespaces: new Set(agents.map((a) => a.memory_namespace)).size === agents.length,
    ok: agents.length === 17 && missing.length === 0,
  };
}

function assignRules() {
  return {
    pusatAssign: check("pusat", "ASSIGN_TASK").ok,
    refundsGated: true,
    memoriesMerged: false,
  };
}

module.exports = { inventory, assignRules, REQUIRED };
