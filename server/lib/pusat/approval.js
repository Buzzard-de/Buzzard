/**
 * Human Approval Center — bound to exact action + input hash.
 * Material input changes invalidate approval.
 */

const { db } = require("../db");
const controlCenter = require("../controlCenter");
const { APPROVAL_STATUS, DEFAULT_APPROVAL_TTL_MS, RISK_LEVEL } = require("./constants");
const { hashInput, newId } = require("./hash");

function parseJson(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function mapApproval(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    requestingAgent: row.requesting_agent,
    action: row.action,
    reason: row.reason,
    requiredApprover: parseJson(row.metadata_json, {}).requiredApprover || "admin",
    financialImpact: parseJson(row.metadata_json, {}).financialImpact || null,
    aiRecommendation: row.ai_recommendation,
    input: parseJson(row.metadata_json, {}).input || null,
    expectedSideEffects: row.expected_side_effects || parseJson(row.metadata_json, {}).expectedSideEffects || null,
    riskLevel: row.risk_level,
    status: row.status,
    inputHash: row.input_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    executionResult: row.execution_result,
    metadata: parseJson(row.metadata_json, {}),
  };
}

function getApproval(id) {
  const row = db.prepare("SELECT * FROM core_approvals WHERE id = ?").get(id);
  return mapApproval(row);
}

function expireDue(now = new Date()) {
  const iso = now.toISOString();
  const due = db
    .prepare(
      `SELECT id FROM core_approvals
       WHERE status = 'PENDING' AND expires_at IS NOT NULL AND expires_at <= ?`
    )
    .all(iso);
  for (const row of due) {
    db.prepare(
      `UPDATE core_approvals SET status = ?, decided_at = CURRENT_TIMESTAMP, decided_by = 'system_expiry'
       WHERE id = ? AND status = 'PENDING'`
    ).run(APPROVAL_STATUS.EXPIRED, row.id);
    controlCenter.recordSystemEvent({
      eventType: "approval.expired",
      resourceType: "approval",
      resourceId: row.id,
      summary: "Approval expired",
    });
  }
  return due.length;
}

function requestApproval({
  taskId,
  requestingAgent,
  action,
  reason,
  input,
  expectedSideEffects,
  riskLevel,
  ttlMs = DEFAULT_APPROVAL_TTL_MS,
  aiRecommendation,
  requiredApprover,
  financialImpact,
  resourceType,
  resourceId,
} = {}) {
  const id = newId("appr");
  const inputHash = hashInput(input || {});
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const metadata = {
    input: input || {},
    expectedSideEffects: expectedSideEffects || [],
    requestingAgent,
    action,
    requiredApprover: requiredApprover || "admin",
    financialImpact: financialImpact || null,
  };

  db.prepare(
    `INSERT INTO core_approvals(
      id, task_id, resource_type, resource_id, ai_recommendation, reason, risk_level, status,
      metadata_json, expires_at, input_hash, action, requesting_agent, expected_side_effects
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    taskId || null,
    resourceType || "ai_task",
    resourceId || taskId || null,
    aiRecommendation || `Review ${action || "action"} before execution`,
    reason || "",
    riskLevel || RISK_LEVEL.HIGH,
    JSON.stringify(metadata),
    expiresAt,
    inputHash,
    action || null,
    requestingAgent || null,
    typeof expectedSideEffects === "string" ? expectedSideEffects : JSON.stringify(expectedSideEffects || [])
  );

  if (taskId) {
    controlCenter.updateTaskStatus(taskId, "WAITING_APPROVAL");
  }

  controlCenter.recordSystemEvent({
    eventType: "approval.created",
    resourceType: "approval",
    resourceId: id,
    summary: `Approval requested: ${action || reason}`,
    metadata: { riskLevel: riskLevel || RISK_LEVEL.HIGH, inputHash },
  });

  return getApproval(id);
}

function assertBound(approval, currentInput) {
  if (!approval) return { ok: false, code: "approval_missing" };
  expireDue();
  const fresh = getApproval(approval.id);
  if (fresh.status === APPROVAL_STATUS.EXPIRED) {
    return { ok: false, code: "expired", approval: fresh };
  }
  if (fresh.status === APPROVAL_STATUS.CANCELLED) {
    return { ok: false, code: "cancelled", approval: fresh };
  }
  if (fresh.status !== APPROVAL_STATUS.APPROVED) {
    return { ok: false, code: "not_approved", approval: fresh };
  }
  const currentHash = hashInput(currentInput || {});
  if (fresh.inputHash && fresh.inputHash !== currentHash) {
    return { ok: false, code: "input_changed", approval: fresh, currentHash };
  }
  return { ok: true, approval: fresh };
}

function isForbiddenApprover(decidedBy, requestingAgent) {
  const actor = String(decidedBy || "").trim();
  if (!actor) {
    return { forbidden: true, code: "approver_identity_required" };
  }
  const actorLc = actor.toLowerCase();
  const agentLc = String(requestingAgent || "").trim().toLowerCase();
  if (agentLc && actorLc === agentLc) {
    return { forbidden: true, code: "ai_cannot_self_approve" };
  }
  if (
    actorLc === "ai" ||
    actorLc === "pusat" ||
    actorLc === "guardian" ||
    actorLc === "orchestrator" ||
    actorLc === "esat_bey" ||
    /_ai$/.test(actorLc) ||
    /^(ai|agent)[-_]/.test(actorLc)
  ) {
    return { forbidden: true, code: "ai_cannot_self_approve" };
  }
  return { forbidden: false };
}

function decide(id, decision, decidedBy, { currentInput } = {}) {
  expireDue();
  const existing = getApproval(id);
  if (!existing) return null;

  if (existing.status !== APPROVAL_STATUS.PENDING) {
    return { duplicate: true, approval: existing };
  }

  if (existing.expiresAt && new Date(existing.expiresAt).getTime() <= Date.now()) {
    db.prepare(
      `UPDATE core_approvals SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(APPROVAL_STATUS.EXPIRED, "system_expiry", id);
    return { expired: true, approval: getApproval(id) };
  }

  const normalized = String(decision || "").toLowerCase();
  if (normalized === "approve") {
    const forbidden = isForbiddenApprover(decidedBy, existing.requestingAgent);
    if (forbidden.forbidden) {
      return { rejected: true, code: forbidden.code, approval: existing };
    }
  }
  if (normalized === "approve" && currentInput !== undefined) {
    const currentHash = hashInput(currentInput);
    if (existing.inputHash && existing.inputHash !== currentHash) {
      db.prepare(
        `UPDATE core_approvals SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP,
         execution_result = ? WHERE id = ?`
      ).run(APPROVAL_STATUS.CANCELLED, decidedBy || "system", "input_changed", id);
      controlCenter.recordSystemEvent({
        eventType: "approval.input_changed",
        resourceType: "approval",
        resourceId: id,
        summary: "Approval cancelled because material inputs changed",
      });
      return { inputChanged: true, approval: getApproval(id) };
    }
  }

  const status =
    normalized === "approve"
      ? APPROVAL_STATUS.APPROVED
      : normalized === "cancel"
        ? APPROVAL_STATUS.CANCELLED
        : APPROVAL_STATUS.REJECTED;

  db.prepare(
    `UPDATE core_approvals SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(status, decidedBy || null, id);

  const approval = getApproval(id);
  if (approval?.taskId) {
    controlCenter.updateTaskStatus(
      approval.taskId,
      status === APPROVAL_STATUS.APPROVED ? "ASSIGNED" : "CANCELLED"
    );
  }

  controlCenter.recordSystemEvent({
    eventType: `approval.${normalized || "reject"}`,
    actorType: "admin",
    actorId: decidedBy,
    resourceType: "approval",
    resourceId: id,
    summary: `Approval ${status.toLowerCase()}`,
  });

  return { approval };
}

function cancel(id, decidedBy, reason) {
  const existing = getApproval(id);
  if (!existing) return null;
  if (existing.status !== APPROVAL_STATUS.PENDING) return { duplicate: true, approval: existing };
  db.prepare(
    `UPDATE core_approvals SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP, execution_result = ?
     WHERE id = ?`
  ).run(APPROVAL_STATUS.CANCELLED, decidedBy || null, reason || "cancelled", id);
  if (existing.taskId) controlCenter.updateTaskStatus(existing.taskId, "CANCELLED");
  return { approval: getApproval(id) };
}

function markExecutionFailed(id, result) {
  db.prepare(
    `UPDATE core_approvals SET status = ?, execution_result = ? WHERE id = ?`
  ).run(APPROVAL_STATUS.EXECUTION_FAILED, typeof result === "string" ? result : JSON.stringify(result || {}), id);
  return getApproval(id);
}

function listApprovals(status) {
  expireDue();
  let sql = "SELECT * FROM core_approvals";
  const params = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  return db.prepare(sql).all(...params).map(mapApproval);
}

function latestForTask(taskId) {
  const row = db
    .prepare("SELECT * FROM core_approvals WHERE task_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(taskId);
  return mapApproval(row);
}

module.exports = {
  requestApproval,
  decide,
  cancel,
  expireDue,
  assertBound,
  markExecutionFailed,
  getApproval,
  listApprovals,
  latestForTask,
  hashInput,
  isForbiddenApprover,
};
