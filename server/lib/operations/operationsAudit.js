/**
 * Part 17 — Immutable operations audit log (SQLite, no secrets).
 */
const crypto = require("crypto");
const { db } = require("../db");
const { redactForLog } = require("../security");
const { AUDIT_ACTIONS } = require("../../core/operationsConstants");

function auditId() {
  return `opaud_${crypto.randomBytes(8).toString("hex")}`;
}

function recordAudit({
  actor,
  action,
  resource,
  resourceId,
  result = "success",
  reason = null,
  correlationId = null,
  requestId = null,
  jobId = null,
  metadata = null,
} = {}) {
  const id = auditId();
  const safeMeta = metadata ? redactForLog(metadata) : null;

  db.prepare(`
    INSERT INTO core_operations_audit(
      id, timestamp, actor, action, resource, resource_id, result, reason,
      correlation_id, request_id, job_id, metadata_json
    ) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    actor || "system",
    action,
    resource || null,
    resourceId || null,
    result,
    reason,
    correlationId,
    requestId,
    jobId,
    safeMeta ? JSON.stringify(safeMeta) : null
  );

  return {
    id,
    timestamp: new Date().toISOString(),
    actor: actor || "system",
    action,
    resource,
    resourceId,
    result,
    reason,
    correlationId,
    requestId,
    jobId,
  };
}

function recordFromRequest(req, { action, resource, resourceId, result, reason, metadata } = {}) {
  const actor = req.adminUser?.email || req.user?.email || req.adminUser?.userId || "anonymous";
  return recordAudit({
    actor,
    action,
    resource,
    resourceId,
    result,
    reason,
    correlationId: req.correlationId || req.operationsContext?.correlationId,
    requestId: req.requestId || req.operationsContext?.requestId,
    jobId: req.operationsContext?.jobId,
    metadata,
  });
}

function listAudit({ limit = 100, action, resource, correlationId } = {}) {
  let sql = "SELECT * FROM core_operations_audit WHERE 1=1";
  const params = [];
  if (action) {
    sql += " AND action = ?";
    params.push(action);
  }
  if (resource) {
    sql += " AND resource = ?";
    params.push(resource);
  }
  if (correlationId) {
    sql += " AND correlation_id = ?";
    params.push(correlationId);
  }
  sql += " ORDER BY timestamp DESC LIMIT ?";
  params.push(Math.min(limit, 500));

  return db.prepare(sql).all(...params).map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    actor: row.actor,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    result: row.result,
    reason: row.reason,
    correlationId: row.correlation_id,
    requestId: row.request_id,
    jobId: row.job_id,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  }));
}

function findByCorrelationId(correlationId) {
  return listAudit({ correlationId, limit: 200 });
}

module.exports = {
  recordAudit,
  recordFromRequest,
  listAudit,
  findByCorrelationId,
  AUDIT_ACTIONS,
};
