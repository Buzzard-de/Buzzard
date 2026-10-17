/**
 * Production restore must stay fail-closed.
 * A local temp restore is not production evidence.
 */

const { isEphemeralPath } = require("../dbPaths");

function isProductionRestoreTarget(dbPath, env = process.env) {
  const resolved = String(dbPath || "");
  return env.NODE_ENV === "production" || resolved.startsWith("/var/data");
}

function assertRestoreAllowed(dbPath, env = process.env) {
  if (env.NODE_ENV === "production" && isEphemeralPath(dbPath)) {
    const error = new Error("Refusing restore to an ephemeral path in production");
    error.code = "PRODUCTION_EPHEMERAL_PATH";
    error.target = "ephemeral";
    throw error;
  }
  if (isProductionRestoreTarget(dbPath, env) && env.BUZZARD_ALLOW_PRODUCTION_RESTORE !== "1") {
    const error = new Error("Refusing restore to production target without BUZZARD_ALLOW_PRODUCTION_RESTORE=1");
    error.code = "PRODUCTION_RESTORE_BLOCKED";
    error.target = "production";
    throw error;
  }
  return { allowed: true, production: false };
}

function executeRestore(input = {}, env = process.env) {
  const dbPath = input.dbPath || input.targetPath || "";
  try {
    assertRestoreAllowed(dbPath, env);
  } catch (error) {
    return {
      ok: false,
      executed: false,
      live: false,
      restored: false,
      productionVerified: false,
      reason: error.code || "RESTORE_BLOCKED",
      allowFlagIgnored: env.BUZZARD_ALLOW_PRODUCTION_RESTORE === "1",
    };
  }
  return {
    ok: false,
    executed: false,
    live: false,
    restored: false,
    productionVerified: false,
    allowFlagIgnored: env.BUZZARD_ALLOW_PRODUCTION_RESTORE === "1",
    reason: "RESTORE_EXECUTE_BLOCKED",
    note: "Software never overwrites a database. A local dry-run is not production restore evidence.",
  };
}

function confirmRestore() {
  return {
    ok: false,
    restored: false,
    live: false,
    productionVerified: false,
    reason: "RESTORE_CONFIRM_BLOCKED",
  };
}

module.exports = { isProductionRestoreTarget, assertRestoreAllowed, executeRestore, confirmRestore };
