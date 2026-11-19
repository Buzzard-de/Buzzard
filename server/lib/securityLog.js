const path = require("path");
const { redactForLog, maskEmail, emailReference } = require("./security");
const { resolveDataDir } = require("./dataDir");
const { appendRecord, readRecords } = require("./recordStore");
const requestScope = require("./requestScope");

const dataDir = resolveDataDir();
const logFile = path.join(dataDir, "security-log.json");
const MAX_ENTRIES = 5000;
// A client that keeps hitting a limiter produces the same event again and
// again. One entry per window is written, the rest are counted.
const COALESCE_WINDOW_MS = 60_000;
const MAX_COALESCE_KEYS = 5000;
const coalesced = new Map();

const EVENT_SEVERITY = {
  admin_login: "INFO",
  admin_logout: "INFO",
  admin_login_2fa_required: "INFO",
  session_revoked: "INFO",
  admin_login_failed: "WARNING",
  admin_login_2fa_failed: "WARNING",
  admin_login_rate_limited: "WARNING",
  auth_login_rate_limited: "WARNING",
  auth_login_failed: "WARNING",
  password_reset_refused: "HIGH",
  api_rate_limited: "WARNING",
  permission_denied: "WARNING",
  csrf_failure: "HIGH",
  idor_attempt: "HIGH",
  ai_permission_violation: "HIGH",
  privilege_escalation_attempt: "CRITICAL",
  admin_login_locked: "CRITICAL",
  admin_account_locked: "CRITICAL",
  checkout_blocked: "WARNING",
  payment_attempt_blocked: "HIGH",
  order_creation_blocked: "HIGH",
  price_tampering: "CRITICAL",
  coupon_tampering: "CRITICAL",
  quantity_tampering: "HIGH",
  idempotency_conflict: "INFO",
  commerce_permission_denied: "HIGH",
  commercial_order_blocked: "CRITICAL",
  supplier_order_blocked: "CRITICAL",
  go_live_blocked: "WARNING",
  go_live_requested: "INFO",
  go_live_approved: "INFO",
  webhook_rejected: "HIGH",
  webhook_accepted: "INFO",
  webhook_duplicate: "INFO",
};

function readLog() {
  return readRecords(logFile);
}

function inferSeverity(type) {
  return EVENT_SEVERITY[type] || (String(type).includes("failed") ? "WARNING" : "INFO");
}

function cleanText(value, max) {
  if (value === undefined || value === null || value === "") return null;
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

function buildEntry(event) {
  const type = cleanText(event.type, 80) || "unknown";
  const entry = {
    id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type,
    severity: event.severity || inferSeverity(type),
    source: cleanText(event.source, 40) || "api",
    success: event.success !== false,
    ip: cleanText(event.ip, 45),
    // Route patterns and paths only: a query string can carry tokens.
    path: cleanText(String(event.path || "").split("?")[0], 300),
    userId: cleanText(event.userId, 120),
    email: maskEmail(event.email),
    emailRef: emailReference(event.email),
    role: cleanText(event.role, 40),
    resource: cleanText(event.resource, 200),
    status: cleanText(event.status, 40) || (event.success !== false ? "ok" : "denied"),
    detail: event.detail ? redactForLog(event.detail) : null,
    ...requestScope.ids(),
  };
  return entry;
}

function persist(entry) {
  const stored = appendRecord(logFile, entry, { keep: MAX_ENTRIES });
  console.log("[security]", JSON.stringify(entry));
  return stored;
}

function coalesceKey(entry) {
  return [entry.type, entry.ip, entry.path, entry.userId, entry.emailRef, entry.detail?.scope].join("|");
}

function flushCoalesced(now = Date.now(), { all = false } = {}) {
  for (const [key, slot] of coalesced) {
    if (!all && now < slot.until) continue;
    coalesced.delete(key);
    if (slot.suppressed > 0) {
      persist({
        ...slot.template,
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        detail: { ...(slot.template.detail || {}), repeated: slot.suppressed, windowSeconds: COALESCE_WINDOW_MS / 1000 },
      });
    }
  }
}

const flushTimer = setInterval(() => {
  try {
    flushCoalesced();
    flushAnonymousBudget();
  } catch (err) {
    console.error("[security] could not write repeated-event summary:", err.code || err.message);
  }
}, COALESCE_WINDOW_MS / 2);
flushTimer.unref();

/**
 * A request to a protected route without any credentials names no account and
 * can be produced at will. Each address gets a number of individual entries
 * per window; what exceeds it is counted and written as one summary. Events
 * that concern an account (failed sign-ins, refusals, webhooks) are always
 * written one by one; the request limiters bound how many there can be.
 */
const ANONYMOUS_FAILURES_PER_WINDOW = 30;
const BUDGETED_TYPES = new Set(["admin_auth_required", "customer_auth_required"]);
const anonymousBudget = new Map();

function overAnonymousBudget(entry, now) {
  if (!BUDGETED_TYPES.has(entry.type) || entry.userId || entry.emailRef) return false;
  const key = entry.ip || "unknown";
  let slot = anonymousBudget.get(key);
  if (!slot || now >= slot.until) {
    if (slot) writeBudgetSummary(key, slot);
    if (anonymousBudget.size >= MAX_COALESCE_KEYS) flushAnonymousBudget(now, { all: true });
    slot = { until: now + COALESCE_WINDOW_MS, written: 0, suppressed: 0, types: {} };
    anonymousBudget.set(key, slot);
  }
  if (slot.written < ANONYMOUS_FAILURES_PER_WINDOW) {
    slot.written += 1;
    return false;
  }
  slot.suppressed += 1;
  slot.types[entry.type] = (slot.types[entry.type] || 0) + 1;
  return true;
}

function writeBudgetSummary(ip, slot) {
  if (!slot.suppressed) return;
  const suppressed = slot.suppressed;
  slot.suppressed = 0;
  persist(
    buildEntry({
      type: "unauthenticated_requests_summarised",
      severity: "HIGH",
      success: false,
      ip,
      detail: { repeated: suppressed, windowSeconds: COALESCE_WINDOW_MS / 1000, types: slot.types },
    })
  );
}

function flushAnonymousBudget(now = Date.now(), { all = false } = {}) {
  for (const [key, slot] of anonymousBudget) {
    if (!all && now < slot.until) continue;
    anonymousBudget.delete(key);
    writeBudgetSummary(key, slot);
  }
}

function logSecurityEvent(event) {
  const entry = buildEntry(event || {});
  if (overAnonymousBudget(entry, Date.now())) return { ...entry, coalesced: true };
  if (entry.type.endsWith("_rate_limited")) {
    const now = Date.now();
    const key = coalesceKey(entry);
    const slot = coalesced.get(key);
    if (slot && now < slot.until) {
      slot.suppressed += 1;
      return { ...entry, coalesced: true };
    }
    flushCoalesced(now);
    if (coalesced.size >= MAX_COALESCE_KEYS) flushCoalesced(now, { all: true });
    coalesced.set(key, { until: now + COALESCE_WINDOW_MS, suppressed: 0, template: entry });
  }
  return persist(entry);
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
    const ref = emailReference(q);
    rows = rows.filter(
      (r) => String(r.email || r.userId || "").toLowerCase().includes(q) || (ref !== null && r.emailRef === ref)
    );
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
  flushCoalesced,
  flushAnonymousBudget,
  ANONYMOUS_FAILURES_PER_WINDOW,
  COALESCE_WINDOW_MS,
  MAX_ENTRIES,
  logFile,
};
