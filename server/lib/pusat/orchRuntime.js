/**
 * Shared Pusat orchestrator instances keyed by isolated SQLite path.
 */
const os = require("os");
const path = require("path");
const { createOrchestrator } = require("./orchestrator");
const { assertNotGuardian } = require("./durableTaskQueue");

const instances = new Map();

function resolveDbPath(dbPath) {
  let selected;
  if (dbPath == null || (typeof dbPath === "string" && !dbPath.trim())) {
    const fromEnv = typeof process.env.PUSAT_ORCH_DB === "string" ? process.env.PUSAT_ORCH_DB.trim() : "";
    selected = fromEnv || path.join(os.tmpdir(), "buzzard-pusat-orch.sqlite");
  } else if (typeof dbPath === "string") {
    selected = dbPath.trim();
  } else {
    const err = new Error("ORCH_DB_PATH_UNVERIFIED");
    err.code = "DATA_PATH_REFUSED";
    throw err;
  }
  return assertNotGuardian(selected);
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

function workerHealth({ dbPath } = {}) {
  return getOrchestrator({ dbPath }).queue.health().workers;
}

module.exports = { getOrchestrator, resolveDbPath, forget, workerHealth };
