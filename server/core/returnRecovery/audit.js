const crypto = require("crypto");
const { redactForLog } = require("../../lib/security");
const { AUDIT_ACTIONS } = require("./constants");

const auditLog = [];

function recordReturnAudit({
  action,
  returnCaseId,
  actor = "system",
  result = "success",
  metadata = {},
}) {
  const entry = {
    id: `rraud_${crypto.randomBytes(6).toString("hex")}`,
    timestamp: new Date().toISOString(),
    action,
    returnCaseId,
    actor,
    result,
    metadata: redactForLog(metadata),
  };
  auditLog.push(entry);

  try {
    const operationsAudit = require("../../lib/operations/operationsAudit");
    operationsAudit.recordAudit({
      actor,
      action: `return_recovery.${action}`,
      resource: "return_case",
      resourceId: returnCaseId,
      result,
      metadata: entry.metadata,
    });
  } catch {
    /* non-blocking when DB unavailable in unit tests */
  }

  return entry;
}

function listAuditForCase(returnCaseId) {
  return auditLog.filter((e) => e.returnCaseId === returnCaseId);
}

function listAllAudit() {
  return [...auditLog];
}

function __resetAuditForTests() {
  auditLog.length = 0;
}

module.exports = {
  AUDIT_ACTIONS,
  recordReturnAudit,
  listAuditForCase,
  listAllAudit,
  __resetAuditForTests,
};
