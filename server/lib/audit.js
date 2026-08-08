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

function logAudit({ userId, userEmail, action, entityType, entityId, field, oldValue, newValue }) {
  const entries = readLog();
  entries.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    userEmail,
    action,
    entityType,
    entityId,
    field: field || null,
    oldValue: oldValue ?? null,
    newValue: newValue ?? null,
    timestamp: new Date().toISOString(),
  });
  writeLog(entries);
}

function listAudit(limit = 100) {
  return readLog().slice(-limit).reverse();
}

module.exports = { logAudit, listAudit };
