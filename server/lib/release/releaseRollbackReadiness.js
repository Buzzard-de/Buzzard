/**
 * Part 24 — Rollback readiness (no automatic rollback).
 */
function evaluateRollbackReadiness({
  previousRelease = null,
  databaseRollback = true,
  configurationRollback = true,
} = {}) {
  const ready =
    Boolean(previousRelease) &&
    databaseRollback === true &&
    configurationRollback === true;

  return {
    ready,
    status: ready ? "READY" : "CONDITION",
    previousReleaseAvailable: Boolean(previousRelease),
    databaseRollback,
    configurationRollback,
    automaticRollback: false,
  };
}

module.exports = {
  evaluateRollbackReadiness,
};
