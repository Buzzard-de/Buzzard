const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");
const auditFile = path.join(dataDir, "audit-log.json");

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readLog() {
  ensureDataDir();
  if (!fs.existsSync(auditFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(auditFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeLog(entries) {
  ensureDataDir();
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
  result = "success",
  ip,
  userAgent,
  metadata,
}) {
  const entries = readLog();
  entries.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: userId || null,
    userEmail: userEmail || null,
    action,
    entityType,
    entityId: entityId || null,
    field: field || null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    result,
    ip: ip || null,
    userAgent: userAgent || null,
    metadata: metadata || null,
    timestamp: new Date().toISOString(),
  });
  writeLog(entries);
}

function logAuditFromRequest(req, payload) {
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null;
  const userAgent = req.headers["user-agent"] || null;
  const user = req.adminUser || {};
  logAudit({
    userId: user.userId || user.id,
    userEmail: user.email,
    ip,
    userAgent,
    ...payload,
  });
}

function listAudit(limit = 100, filters = {}) {
  let rows = readLog().slice().reverse();
  if (filters.action) rows = rows.filter((r) => r.action === filters.action);
  if (filters.entityType) rows = rows.filter((r) => r.entityType === filters.entityType);
  return rows.slice(0, limit);
}

module.exports = { logAudit, logAuditFromRequest, listAudit };
