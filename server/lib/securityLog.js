const fs = require("fs");
const path = require("path");
const { redactForLog } = require("./security");

const dataDir = path.join(__dirname, "..", "data");
const logFile = path.join(dataDir, "security-log.json");
const MAX_ENTRIES = 5000;

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readLog() {
  ensureDataDir();
  if (!fs.existsSync(logFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(logFile, "utf8") || "[]");
  } catch {
    return [];
  }
}

function writeLog(entries) {
  ensureDataDir();
  fs.writeFileSync(logFile, JSON.stringify(entries.slice(-MAX_ENTRIES), null, 2), "utf8");
}

function logSecurityEvent(event) {
  const entry = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: event.type,
    success: event.success !== false,
    ip: event.ip || null,
    path: event.path || null,
    userId: event.userId || null,
    email: event.email || null,
    role: event.role || null,
    detail: event.detail ? redactForLog(event.detail) : null,
  };

  const entries = readLog();
  entries.push(entry);
  writeLog(entries);

  console.log("[security]", JSON.stringify(entry));
  return entry;
}

function listSecurityEvents(limit = 100) {
  return readLog().slice(-limit).reverse();
}

module.exports = { logSecurityEvent, listSecurityEvents };
