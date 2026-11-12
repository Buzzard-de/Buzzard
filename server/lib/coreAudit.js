const fs = require("fs");
const path = require("path");

function auditPaths() {
  const dataDir = process.env.BUZZARD_AUDIT_DIR
    ? path.resolve(process.env.BUZZARD_AUDIT_DIR)
    : path.join(__dirname, "..", "data");
  return { dataDir, auditFile: path.join(dataDir, "audit-log.json") };
}

function ensureDataDir() {
  const { dataDir } = auditPaths();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readLog() {
  ensureDataDir();
  const { auditFile } = auditPaths();
  if (!fs.existsSync(auditFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(auditFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeLog(entries) {
  ensureDataDir();
  const { auditFile } = auditPaths();
  fs.writeFileSync(auditFile, JSON.stringify(entries.slice(-5000), null, 2), "utf8");
}

function logAudit({
  userId,
  userEmail,
  action,
  entityType,
  entityId,
  field,
  oldValue,
  newValue,
  result = "UNKNOWN",
  ip,
  userAgent,
  metadata,
}) {
  const entries = readLog();
  entries.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: userId || null,
    userEmail: null,
    action,
    entityType,
    entityId: entityId || null,
    field: field || null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    result,
    ip: null,
    userAgent: null,
    metadata: metadata || null,
    timestamp: new Date().toISOString(),
  });
  writeLog(entries);
}

function logAuditFromRequest(req, payload) {
  const user = req.adminUser || {};
  logAudit({
    userId: user.userId || user.id,
    ...payload,
    userEmail: null,
    ip: null,
    userAgent: null,
  });
}

function listAudit(limit = 100, filters = {}) {
  let rows = readLog().slice().reverse();
  if (filters.action) rows = rows.filter((r) => r.action === filters.action);
  if (filters.entityType) rows = rows.filter((r) => r.entityType === filters.entityType);
  return rows.slice(0, limit).map((row) => ({ ...row, userEmail: null, ip: null, userAgent: null }));
}

module.exports = { logAudit, logAuditFromRequest, listAudit };
