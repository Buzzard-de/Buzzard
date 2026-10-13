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
  return {
    codeReady: true,
    productionWired: false,
    productionStatus: "UNKNOWN",
    renderDisk: "UNKNOWN",
    productionDb: "UNKNOWN",
    rollback: "UNKNOWN",
    reason: "BLOCKED_EXTERNAL",
    rules: alertRules(),
    liveVerified: false,
  };
}

module.exports = {
  alertRules,
  readiness,
};
