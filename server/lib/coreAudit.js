const path = require("path");
const { resolveDataDir } = require("./dataDir");
const { appendRecord, readRecords } = require("./recordStore");
const { redactForLog, getClientIp } = require("./security");
const requestScope = require("./requestScope");

const dataDir = resolveDataDir();
const auditFile = path.join(dataDir, "audit-log.json");
const MAX_ENTRIES = 5000;
const RESULTS = new Set(["success", "failure", "denied", "rejected", "error", "aborted", "blocked", "refused", "pending_approval", "approval_required"]);

function readLog() {
  return readRecords(auditFile);
}

function text(value, max) {
  if (value === undefined || value === null || value === "") return null;
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

/** Values are kept for the record of what changed, never credentials. */
function loggedValue(value) {
  if (value === undefined || value === null) return null;
  return redactForLog(value);
}

function logAudit({
  userId,
  userEmail,
  role,
  action,
  entityType,
  entityId,
  field,
  oldValue,
  newValue,
  result = "success",
  ip,
  userAgent,
  metadata,
  // Names used by the commerce modules for the same things.
  actorId,
  actorType,
  resourceType,
  resourceId,
}) {
  userId = userId ?? actorId;
  entityType = entityType ?? resourceType;
  entityId = entityId ?? resourceId;
  const sensitiveField = typeof field === "string" && redactForLog({ [field]: "x" })[field] !== "x";
  return appendRecord(
    auditFile,
    {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: text(userId, 120),
      userEmail: text(userEmail, 254),
      role: text(role, 40),
      actorType: text(actorType, 40) || (userId ? "user" : "system"),
      action: text(action, 120) || "unknown",
      entityType: text(entityType, 80),
      entityId: text(entityId, 200),
      field: text(field, 120),
      oldValue: sensitiveField && oldValue != null ? "[redacted]" : loggedValue(oldValue),
      newValue: sensitiveField && newValue != null ? "[redacted]" : loggedValue(newValue),
      result: RESULTS.has(result) ? result : text(result, 40) || "success",
      ip: text(ip, 45),
      userAgent: text(userAgent, 300),
      metadata: metadata ? redactForLog(metadata) : null,
      ...requestScope.ids(),
      timestamp: new Date().toISOString(),
    },
    { keep: MAX_ENTRIES }
  );
}

function logAuditFromRequest(req, payload) {
  const user = req.adminUser || {};
  return logAudit({
    userId: user.userId || user.id,
    userEmail: user.email,
    role: user.role,
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] || null,
    ...payload,
  });
}

function listAudit(limit = 100, filters = {}) {
  let rows = readLog().slice().reverse();
  if (filters.action) rows = rows.filter((r) => r.action === filters.action);
  if (filters.entityType) rows = rows.filter((r) => r.entityType === filters.entityType);
  return rows.slice(0, limit);
}

module.exports = { logAudit, logAuditFromRequest, listAudit, auditFile, MAX_ENTRIES };
