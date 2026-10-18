/**
 * Local monitoring/alert readiness. Does not change production alerting.
 */

function alertRules() {
  return [
    { id: "payment_unsigned_rejected", metric: "payment.webhook_rejected", threshold: 1, action: "page_ops" },
    { id: "inventory_oversell_blocked", metric: "inventory.insufficient", threshold: 1, action: "log" },
    { id: "pusat_circuit_open", metric: "pusat.circuit.open", threshold: 1, action: "page_ops" },
    { id: "job_dead_letter", metric: "jobs.dead_letter", threshold: 1, action: "ticket" },
  ];
}

function readiness() {
  let disk = { exists: false, writable: false, envBuzzardDbPath: process.env.BUZZARD_DB_PATH || null };
  try {
    disk = require("../dbPaths").getRenderDiskDiagnostics();
  } catch {
    disk = { exists: false, writable: false, envBuzzardDbPath: process.env.BUZZARD_DB_PATH || null };
  }
  const localPathKnown = Boolean(process.env.BUZZARD_DB_PATH);
  const productionEvidence = disk.exists && disk.writable && disk.envBuzzardDbPath === "/var/data/buzzard.db";
  return {
    codeReady: true,
    productionWired: false,
    productionStatus: "UNKNOWN",
    renderDisk: productionEvidence ? "CONFIGURED" : "UNKNOWN",
    productionDb: "UNKNOWN",
    rollback: "UNKNOWN",
    localDbPathConfigured: localPathKnown,
    renderMountExists: disk.exists === true,
    reason: productionEvidence ? "LOCAL_CONFIG_ONLY" : "BLOCKED_EXTERNAL",
    rules: alertRules(),
    liveVerified: false,
  };
}

function confirmLive() {
  return {
    ok: false,
    live: false,
    liveVerified: false,
    productionWired: false,
    reason: "MONITORING_LIVE_BLOCKED",
    note: "Local health is not production monitoring evidence.",
  };
}

function dispatchAlerts() {
  return {
    ok: false,
    dispatched: false,
    live: false,
    pager: false,
    smtpSent: false,
    webhookSent: false,
    reason: "MONITORING_ALERT_DISPATCH_BLOCKED",
  };
}

module.exports = {
  alertRules,
  readiness,
  confirmLive,
  dispatchAlerts,
};
