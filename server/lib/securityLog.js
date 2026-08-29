const fs = require("fs");
const path = require("path");
const { redactForLog } = require("./security");

const dataDir = path.join(__dirname, "..", "data");
const logFile = path.join(dataDir, "security-log.json");
const MAX_ENTRIES = 5000;

const EVENT_SEVERITY = {
  admin_login: "INFO",
  admin_logout: "INFO",
  admin_login_2fa_required: "INFO",
  session_revoked: "INFO",
  admin_login_failed: "WARNING",
  admin_login_2fa_failed: "WARNING",
  admin_login_rate_limited: "WARNING",
  auth_login_rate_limited: "WARNING",
  api_rate_limited: "WARNING",
  permission_denied: "WARNING",
  csrf_failure: "HIGH",
  idor_attempt: "HIGH",
  ai_permission_violation: "HIGH",
  privilege_escalation_attempt: "CRITICAL",
  admin_login_locked: "CRITICAL",
  admin_account_locked: "CRITICAL",
};

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

function inferSeverity(type) {
  return EVENT_SEVERITY[type] || (String(type).includes("failed") ? "WARNING" : "INFO");
}

function logSecurityEvent(event) {
  const entry = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: event.type,
    severity: event.severity || inferSeverity(event.type),
    source: event.source || "api",
    success: event.success !== false,
    ip: event.ip || null,
    path: event.path || null,
    userId: event.userId || null,
    email: event.email || null,
    role: event.role || null,
    resource: event.resource || null,
    status: event.status || (event.success !== false ? "ok" : "denied"),
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

function querySecurityEvents(filters = {}) {
  let rows = readLog().slice().reverse();
  if (filters.severity) rows = rows.filter((r) => r.severity === filters.severity);
  if (filters.type) rows = rows.filter((r) => r.type === filters.type);
  if (filters.user) {
    const q = String(filters.user).toLowerCase();
    rows = rows.filter((r) => String(r.email || r.userId || "").toLowerCase().includes(q));
  }
  if (filters.source) rows = rows.filter((r) => r.source === filters.source);
  if (filters.from) {
    const fromMs = new Date(filters.from).getTime();
    rows = rows.filter((r) => new Date(r.timestamp).getTime() >= fromMs);
  }
  if (filters.to) {
    const toMs = new Date(filters.to).getTime();
    rows = rows.filter((r) => new Date(r.timestamp).getTime() <= toMs);
  }
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    rows = rows.filter(
      (r) =>
        String(r.type).toLowerCase().includes(q) ||
        String(r.email || "").toLowerCase().includes(q) ||
        String(r.ip || "").toLowerCase().includes(q) ||
        String(r.path || "").toLowerCase().includes(q)
    );
  }
  const total = rows.length;
  const limit = Math.min(Number(filters.limit) || 50, 200);
  const page = Math.max(Number(filters.page) || 1, 1);
  const offset = (page - 1) * limit;
  return {
    events: rows.slice(offset, offset + limit),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

module.exports = {
  logSecurityEvent,
  listSecurityEvents,
  querySecurityEvents,
  EVENT_SEVERITY,
  inferSeverity,
};
