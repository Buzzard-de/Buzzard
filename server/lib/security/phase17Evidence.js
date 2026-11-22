/**
 * Phase 17 security evidence. Calls the existing Esat, egress, approval,
 * permission, CSRF, rate-limit, and audit functions. No secret values are returned.
 */
const os = require("os");
const path = require("path");
const { db } = require("../db");
const { resolveDbPath } = require("../dbPaths");
const { evaluateEgress } = require("./egressPolicy");
const esat = require("./esatBey");
const { createApprovalCenter } = require("../pusat/humanApproval");
const { check } = require("../buzzardNative/core/permissionEngine");
const { createMultiMemory } = require("../buzzardNative/core/multiMemory");
const { can, requirePermission } = require("../rbac");
const { jwtSecretWeakness } = require("../environmentValidation");
const jwtSecret = require("../jwtSecret");
const { validateCsrfForRequest, generateCsrfToken } = require("../csrf");
const { createRateLimiter, getClientIp, setSecurityHeaders, redactForLog, sanitizeFilename, isSafeId } = require("../security");
const { assertSafeSpawn } = require("./spawnGuard");
const { evaluateSalesGate } = require("../salesSafetyGate");

function writesAllowed() {
  const resolved = path.resolve(resolveDbPath());
  if (resolved.includes(`${path.sep}workspace${path.sep}`)) return false;
  if (path.basename(resolved) === "buzzard.db" && resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) return false;
  return process.env.VITEST === "true" || resolved.startsWith(`${os.tmpdir()}${path.sep}`) || resolved.startsWith("/tmp/");
}

function withEnv(keys, fn) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (previous[key] == null) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

function egressEvidence() {
  const ai = evaluateEgress({ destinationUrl: "https://api.openai.com/v1/chat", payload: { orderId: "SYN" } });
  const payment = evaluateEgress({ destinationUrl: "https://api.stripe.com/v1/charges", payload: { card: "4111" } });
  const loopback = evaluateEgress({ destinationUrl: "https://127.0.0.1/admin" });
  const plain = evaluateEgress({ destinationUrl: "http://example.com/hook" });
  const userinfo = evaluateEgress({ destinationUrl: "https://user:pass@example.com/hook" });
  const watched = esat.watchEgress(ai, { url: "https://api.openai.com/v1/chat" });
  return {
    ok: ai.allowed === false
      && ai.code === "EXTERNAL_AI_EGRESS_DENIED"
      && payment.allowed === false
      && payment.code === "PAYMENT_EGRESS_LOCKED"
      && loopback.allowed === false
      && loopback.code === "PRIVATE_OR_IP_DENIED"
      && plain.allowed === false
      && plain.code === "HTTPS_REQUIRED"
      && userinfo.allowed === false
      && userinfo.code === "URL_USERINFO_DENIED"
      && watched.allowed === false
      && watched.hold === true,
    ai: ai.code,
    payment: payment.code,
    loopback: loopback.code,
  };
}

function secretEvidence() {
  const missing = jwtSecretWeakness("");
  const placeholder = jwtSecretWeakness("DEV_ONLY_CHANGE_ME");
  const sales = evaluateSalesGate();
  return {
    ok: missing != null && placeholder != null && jwtSecret.isConfigured === Boolean(process.env.JWT_SECRET || process.env.AUTH_SECRET) && sales.status === "LOCKED" && sales.allowed !== true,
    missingClosed: missing != null,
    placeholderRejected: placeholder != null,
    configured: jwtSecret.isConfigured === true,
    sales: sales.status,
  };
}

function authzEvidence() {
  const payment = check("sinan_bey", "PAYMENT_ACTIVATE");
  const unknown = check("not_an_agent", "READ_CODE");
  const self = check("esat_bey", "SECURITY_POLICY_CHANGE");
  const staffDenied = can("staff", "security.manage");
  const adminAllowed = can("admin", "products.read");
  const noUser = requirePermission({}, { status() { return this; }, json() { return this; } }, "products.read");
  return {
    ok: payment.ok === false
      && payment.code === "HUMAN_GATE_REQUIRED"
      && unknown.ok === false
      && unknown.code === "UNKNOWN_IDENTITY"
      && self.ok === false
      && self.code === "HUMAN_GATE_REQUIRED"
      && staffDenied === false
      && adminAllowed === true
      && noUser === false,
    payment: payment.code,
    unknown: unknown.code,
  };
}

function memoryEvidence() {
  const memory = createMultiMemory();
  const stored = memory.put({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "phase17", value: "synthetic-note" });
  const own = memory.get({ actorId: "sinan_bey", ownerId: "sinan_bey", type: "personal", key: "phase17" });
  const cross = memory.get({ actorId: "esat_bey", ownerId: "sinan_bey", type: "personal", key: "phase17" });
  return {
    ok: stored.ok === true && own.ok === true && own.value === "synthetic-note" && cross.ok === false && cross.code === "MEMORY_ISOLATION_DENIED",
    crossCode: cross.code || null,
  };
}

function approvalEvidence() {
  const center = createApprovalCenter({ dbPath: path.join(os.tmpdir(), "buzzard-phase17", `apr-${process.pid}-${Date.now()}.sqlite`) });
  try {
    const submitted = center.submit({
      action: "PAYMENT_ACTIVATE",
      requestedBy: "sinan_bey",
      reason: "synthetic",
      risk: "HIGH",
      taskId: "phase17-approval",
    });
    const replaySubmit = center.submit({
      action: "PAYMENT_ACTIVATE",
      requestedBy: "sinan_bey",
      reason: "synthetic",
      risk: "HIGH",
      taskId: "phase17-approval",
    });
    const denied = center.decide({ id: submitted.item.id, approved: true, actorId: "sinan_bey" });
    const approved = center.decide({ id: submitted.item.id, approved: true, actorId: "human" });
    const replay = center.decide({ id: submitted.item.id, approved: true, actorId: "human" });
    const expired = center.submit({
      action: "SALES_ACTIVATE",
      requestedBy: "sinan_bey",
      reason: "synthetic-expire",
      risk: "CRITICAL",
      taskId: "phase17-expire",
      payload: { ttlMs: -1000 },
    });
    return {
      ok: submitted.ok === true
        && submitted.item.status === "WAITING_APPROVAL"
        && submitted.item.auto !== true
        && replaySubmit.duplicate === true
        && denied.ok === false
        && denied.code === "PERMISSION_DENIED"
        && approved.ok === true
        && approved.item.status === "APPROVED"
        && replay.ok === false
        && replay.code === "ALREADY_DECIDED"
        && expired.ok === true,
      denied: denied.code,
      replay: replay.code,
      approved: approved.item.status,
      expireTask: expired.item?.task_id || null,
    };
  } finally {
    center.close();
  }
}

function expireEvidence() {
  const { createDurableTaskQueue } = require("../pusat/durableTaskQueue");
  const queue = createDurableTaskQueue({ dbPath: path.join(os.tmpdir(), "buzzard-phase17", `exp-${process.pid}-${Date.now()}.sqlite`) });
  try {
    const submitted = queue.submitApproval({
      taskId: "phase17-expired",
      action: "SALES_ACTIVATE",
      requestedBy: "sinan_bey",
      reason: "synthetic",
      risk: "CRITICAL",
      ttlMs: -1000,
    });
    const decision = queue.decideApproval({ id: submitted.item.id, approved: true, actorId: "human" });
    return {
      ok: decision.ok === false && decision.code === "EXPIRED",
      code: decision.code,
    };
  } finally {
    queue.close();
  }
}

function auditEvidence() {
  const event = esat.inspect({
    type: "PHASE17_SYNTHETIC_AUDIT",
    details: { note: "'); DROP TABLE esat_security_events;--", password: "not-returned" },
    actor: "phase17",
  });
  const row = db.prepare("SELECT id, type, details_json FROM esat_security_events WHERE id = ?").get(event.eventId);
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'esat_security_events'").get();
  const logged = redactForLog({ password: "not-returned", note: "visible" });
  return {
    ok: Boolean(row)
      && row.type === "PHASE17_SYNTHETIC_AUDIT"
      && String(row.details_json).includes("DROP TABLE")
      && !String(row.details_json).includes("not-returned")
      && table?.name === "esat_security_events"
      && logged.password === "[redacted]"
      && logged.note === "visible",
    persisted: Boolean(row),
    redacted: !String(row?.details_json || "").includes("not-returned"),
  };
}

function inputEvidence() {
  return withEnv(["BUZZARD_CSRF_ENFORCE", "BUZZARD_TRUSTED_PROXY_HOPS"], () => {
    process.env.BUZZARD_CSRF_ENFORCE = "1";
    const token = generateCsrfToken();
    const deniedBody = {};
    const denied = validateCsrfForRequest(
      { method: "POST", url: "/api/admin/products", headers: { cookie: "buzzard_csrf=abc", "x-buzzard-csrf-token": "nope" } },
      { status() { return this; }, json(body) { deniedBody.errorKey = body.errorKey; return this; } }
    );
    const allowed = validateCsrfForRequest(
      { method: "POST", url: "/api/admin/products", headers: { cookie: `buzzard_csrf=${encodeURIComponent(token)}`, "x-buzzard-csrf-token": token } },
      { status() { return this; }, json() { return this; } }
    );
    const traversal = assertSafeSpawn({ file: "../etc/passwd", args: [] });
    const shell = assertSafeSpawn({ file: "tool", shell: true });
    const injection = assertSafeSpawn({ file: "tool", args: ["ok; rm -rf /"] });
    const filename = sanitizeFilename("../../payload.html");
    const safeId = isSafeId("phase17-sku");
    const badId = isSafeId("sku;drop");
    process.env.BUZZARD_TRUSTED_PROXY_HOPS = "1";
    const ip = getClientIp({ headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.9" }, socket: { remoteAddress: "10.0.0.8" } });
    process.env.BUZZARD_TRUSTED_PROXY_HOPS = "0";
    const socketIp = getClientIp({ headers: { "x-forwarded-for": "1.2.3.4" }, socket: { remoteAddress: "203.0.113.8" } });
    const headers = {};
    setSecurityHeaders({ setHeader(name, value) { headers[name] = value; } });
    const limit = createRateLimiter({ windowMs: 60_000, max: 1, keyPrefix: "phase17:" });
    const req = { headers: {}, socket: { remoteAddress: "203.0.113.17" } };
    const bucket = `phase17-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const first = limit(req, { key: bucket });
    const second = limit(req, { key: bucket });
    return {
      ok: denied === false
        && deniedBody.errorKey === "security.csrfInvalid"
        && allowed === true
        && traversal.ok === false
        && traversal.code === "PATH_TRAVERSAL"
        && shell.ok === false
        && shell.code === "SHELL_SPAWN_DENIED"
        && injection.ok === false
        && injection.code === "UNSAFE_ARG"
        && filename === null
        && safeId === true
        && badId === false
        && ip === "203.0.113.9"
        && socketIp === "203.0.113.8"
        && headers["X-Content-Type-Options"] === "nosniff"
        && String(headers["Content-Security-Policy"] || "").includes("default-src 'none'")
        && first === false
        && second === true,
      traversal: traversal.code,
      csrfDenied: denied === false,
      rateLimited: second === true,
    };
  });
}

function runPhase17Evidence() {
  if (!writesAllowed()) {
    return { ok: false, code: "REFUSED_PRODUCTION_DB", live: false, productionReady: false };
  }
  const egress = egressEvidence();
  const secrets = secretEvidence();
  const authz = authzEvidence();
  const memory = memoryEvidence();
  const approval = approvalEvidence();
  const expiry = expireEvidence();
  const audit = auditEvidence();
  const input = inputEvidence();
  const parts = [egress, secrets, authz, memory, approval, expiry, audit, input];
  const failed = ["egress", "secrets", "authz", "memory", "approval", "expiry", "audit", "input"].filter((name, index) => parts[index].ok !== true);
  return {
    ok: failed.length === 0,
    failed,
    egress,
    secrets,
    authz,
    memory,
    approval,
    expiry,
    audit,
    input,
    live: false,
    productionReady: false,
  };
}

module.exports = { runPhase17Evidence };
