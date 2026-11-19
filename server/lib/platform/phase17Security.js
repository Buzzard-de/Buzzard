const { evaluateSecurityReadiness } = require("../security/securityReadiness");
const { runSecurityAudit } = require("../security/securityAudit");
const { inventoryDependencies } = require("../security/egressPolicy");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase17Security() {
  const readiness = evaluateSecurityReadiness();
  const gates = readiness.SECURITY_READINESS?.gates || [];
  const prod = gates.find((g) => g.gate === "PRODUCTION_SAFETY");
  const pay = gates.find((g) => g.gate === "PAYMENT_SAFETY");
  const audit = runSecurityAudit();
  const egress = inventoryDependencies();

  const checks = [
    { id: "SEC_READINESS", ok: readiness.SECURITY_READINESS?.diagnosticOnly === true },
    { id: "SEC_PROD_SAFETY", ok: prod?.status === "PASS" },
    { id: "SEC_PAYMENT_SAFETY", ok: pay?.status === "PASS" },
    { id: "SEC_AUDIT_NO_SECRETS", ok: audit.secretsExposed === false },
    { id: "SEC_EGRESS", ok: Boolean(egress.api) && Boolean(egress.storefront) },
    { id: "SEC_LIVE_RESTART", ok: false, status: "BLOCKED_EXTERNAL", note: "No live API :3001 restart" },
  ];

  return finalizePhase(17, "Güvenlik", checks, ["SEC_LIVE_RESTART"]);
}

module.exports = { evaluatePhase17Security };