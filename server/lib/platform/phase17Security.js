const { evaluateSecurityReadiness } = require("../security/securityReadiness");
const { runSecurityAudit } = require("../security/securityAudit");
const { runPhase17Evidence } = require("../security/phase17Evidence");
const { finalizePhase } = require("./phaseGateFinalize");

function evaluatePhase17Security() {
  const readiness = evaluateSecurityReadiness();
  const gates = readiness.SECURITY_READINESS?.gates || [];
  const prod = gates.find((g) => g.gate === "PRODUCTION_SAFETY");
  const pay = gates.find((g) => g.gate === "PAYMENT_SAFETY");
  const audit = runSecurityAudit();
  const evidence = runPhase17Evidence();

  const checks = [
    { id: "SEC_READINESS", ok: readiness.SECURITY_READINESS?.diagnosticOnly === true },
    { id: "SEC_PROD_SAFETY", ok: prod?.status === "PASS" },
    { id: "SEC_PAYMENT_SAFETY", ok: pay?.status === "PASS" },
    { id: "SEC_AUDIT_NO_SECRETS", ok: audit.secretsExposed === false && evidence.audit?.redacted === true },
    { id: "SEC_EGRESS", ok: evidence.egress?.ok === true, code: evidence.egress?.ai || null },
    { id: "SEC_SECRETS", ok: evidence.secrets?.ok === true && evidence.secrets?.missingClosed === true && evidence.secrets?.placeholderRejected === true },
    { id: "SEC_AUTHZ", ok: evidence.authz?.ok === true && evidence.memory?.ok === true },
    { id: "SEC_APPROVAL", ok: evidence.approval?.ok === true && evidence.expiry?.ok === true },
    { id: "SEC_AUDIT_PERSISTED", ok: evidence.audit?.persisted === true },
    { id: "SEC_INPUT", ok: evidence.input?.ok === true },
    { id: "SEC_FAIL_CLOSED", ok: evidence.ok === true && evidence.failed?.length === 0 },
    { id: "SEC_LIVE_RESTART", ok: false, status: "BLOCKED_EXTERNAL", note: "No live API :3001 restart" },
  ];

  return {
    ...finalizePhase(17, "Güvenlik", checks, ["SEC_LIVE_RESTART"]),
    evidence,
  };
}

module.exports = { evaluatePhase17Security };
