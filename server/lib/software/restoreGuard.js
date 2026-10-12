/**
 * Production restore must stay fail-closed.
 * A local temp restore is not production evidence.
 */

function isProductionRestoreTarget(dbPath, env = process.env) {
  const resolved = String(dbPath || "");
  return env.NODE_ENV === "production" || resolved.startsWith("/var/data");
}

function assertRestoreAllowed(dbPath, env = process.env) {
  if (isProductionRestoreTarget(dbPath, env) && env.BUZZARD_ALLOW_PRODUCTION_RESTORE !== "1") {
    const error = new Error("Refusing restore to production target without BUZZARD_ALLOW_PRODUCTION_RESTORE=1");
    error.code = "PRODUCTION_RESTORE_BLOCKED";
    error.target = dbPath;
    throw error;
  }
  return { allowed: true, production: false };
}

module.exports = { isProductionRestoreTarget, assertRestoreAllowed };
