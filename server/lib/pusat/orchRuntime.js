/**
 * Shared Pusat orchestrator instances keyed by isolated SQLite path.
 */
const os = require("os");
const path = require("path");
const { createOrchestrator } = require("./orchestrator");
const { assertNotGuardian } = require("./durableTaskQueue");

const instances = new Map();

function resolveDbPath(dbPath) {
  const resolved = dbPath || process.env.PUSAT_ORCH_DB || path.join(os.tmpdir(), "buzzard-pusat-orch.sqlite");
  assertNotGuardian(resolved);
  return resolved;
}

function getOrchestrator({ dbPath } = {}) {
  const key = resolveDbPath(dbPath);
  if (!instances.has(key)) {
    instances.set(key, createOrchestrator({ dbPath: key }));
  }
  return instances.get(key);
}

function forget(dbPath) {
  const key = resolveDbPath(dbPath);
  const inst = instances.get(key);
  if (inst) {
    try {
      inst.close();
    } catch {
      /* already closed */
    }
    instances.delete(key);
  }
}

module.exports = { getOrchestrator, resolveDbPath, forget };
