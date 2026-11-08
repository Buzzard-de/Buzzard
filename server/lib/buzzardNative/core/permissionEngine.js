const DANGEROUS = Object.freeze([
  "GIT_PUSH",
  "GIT_MERGE",
  "DEPLOY",
  "PRODUCTION_WRITE",
  "PAYMENT_ACTIVATE",
  "SALES_ACTIVATE",
  "DATA_EXPORT",
  "DATA_DELETE",
  "SECURITY_POLICY_CHANGE",
  "CLONE_OFFICIAL_VOICE",
  "TAX_PAY",
  "TAX_FILE_RETURN",
  "BANK_TRANSFER",
  "CUSTOMS_FILE_DECLARATION",
  "CUSTOMS_RELEASE",
  "CUSTOMS_LEGAL_APPROVE",
]);

const SAFE = Object.freeze({
  pusat: [
    "ASSIGN_TASK",
    "SEND_AGENT_MESSAGE",
    "REQUEST_APPROVAL",
    "READ_PROJECT_REPORTS",
    "CREATE_REPORTS",
    "ACCESS_SHARED_MEMORY",
  ],
  sinan_bey: [
    "READ_CODE",
    "ANALYZE_CODE",
    "CREATE_LOCAL_BRANCH",
    "MODIFY_LOCAL_CODE",
    "RUN_TESTS",
    "READ_PROJECT_REPORTS",
    "CREATE_REPORTS",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "REQUEST_APPROVAL",
  ],
  esat_bey: [
    "READ_PROJECT_REPORTS",
    "CREATE_REPORTS",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "REQUEST_APPROVAL",
  ],
  dogu_bey: ["READ_PROJECT_REPORTS", "CREATE_REPORTS", "ACCESS_PRIVATE_MEMORY", "SEND_AGENT_MESSAGE", "REQUEST_APPROVAL"],
  amelia: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  adrian: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  mira: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  leon: ["SEND_AGENT_MESSAGE", "ACCESS_PRIVATE_MEMORY", "CREATE_REPORTS"],
  nedim_bey: [
    "TAX_READ",
    "TAX_ANALYZE",
    "TAX_CALCULATE",
    "TAX_REPORT",
    "TAX_DRAFT",
    "TAX_SOURCE_REVIEW",
    "TAX_APPROVAL_REQUEST",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
  tuncay_bey: [
    "CUSTOMS_READ",
    "CUSTOMS_ANALYZE",
    "CUSTOMS_CLASSIFY",
    "CUSTOMS_CALCULATE",
    "CUSTOMS_SCREEN",
    "CUSTOMS_REPORT",
    "CUSTOMS_DOCUMENT_DRAFT",
    "CUSTOMS_HOLD",
    "CUSTOMS_APPROVAL_REQUEST",
    "ACCESS_PRIVATE_MEMORY",
    "SEND_AGENT_MESSAGE",
    "CREATE_REPORTS",
    "REQUEST_APPROVAL",
  ],
});

function allowed(agentId, perm) {
  if (DANGEROUS.includes(perm)) return false;
  if (perm === "ACCESS_PRIVATE_MEMORY") return (SAFE[agentId] || []).includes(perm);
  return (SAFE[agentId] || []).includes(perm);
}

function check(agentId, perm) {
  const ok = allowed(agentId, perm);
  return {
    ok,
    agentId,
    perm,
    code: ok ? "ALLOW" : DANGEROUS.includes(perm) ? "HUMAN_GATE_REQUIRED" : "PERMISSION_DENIED",
    selfElevate: false,
  };
}

function selfElevate(agentId, perm) {
  return { ok: false, code: "SELF_ELEVATION_DENIED", agentId, perm };
}

function esatDisableSelf() {
  return check("esat_bey", "SECURITY_POLICY_CHANGE");
}

module.exports = { DANGEROUS, SAFE, allowed, check, selfElevate, esatDisableSelf };
