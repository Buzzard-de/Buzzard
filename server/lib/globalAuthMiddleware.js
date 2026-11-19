/**
 * Global auth + RBAC middleware wrapper for all registered routes.
 */
const authFacade = require("../core/auth");
const { resolveRoutePermission } = require("./routePermissions");
const { validateCsrfForRequest } = require("./csrf");

function wrapRouteHandler(method, routePath, handler) {
  const policy = resolveRoutePermission(method, routePath);
  if (!policy) return handler;

  if (policy.webhook) return webhookHandler(policy.webhook, routePath, handler);

  return function guardedHandler(req, res) {
    if (policy.public) {
      return handler(req, res);
    }

    if (!validateCsrfForRequest(req, res)) {
      return;
    }

    const identity = authFacade.requireAuth(req, res, { realm: "admin" });
    if (!identity) return;

    // Installed before the permission check, so that a refusal is recorded like any other answer.
    if (shouldAudit(method, routePath, policy)) auditBeforeAnswer(req, res, method, routePath, policy);

    if (policy.permission && !authFacade.requirePermission(req, res, policy.permission)) {
      return;
    }

    return handler(req, res);
  };
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Reads that hand out accounts, the logs or bulk data are recorded as well.
const AUDITED_READ_PERMISSIONS = new Set(["users.read", "users.write", "security.read", "audit.read"]);
const READ_REPEAT_WINDOW_MS = 60_000;
const recentReads = new Map();

function shouldAudit(method, routePath, policy) {
  if (WRITE_METHODS.has(method)) return true;
  if (method !== "GET") return false;
  return AUDITED_READ_PERMISSIONS.has(policy.permission) || /\/export(\/|$)/.test(routePath);
}

function resultOf(status) {
  if (status >= 200 && status < 400) return "success";
  if (status === 401 || status === 403) return "denied";
  if (status >= 400 && status < 500) return "rejected";
  return status === 0 ? "aborted" : "error";
}

/**
 * One audit entry per back-office request that changes something or reads
 * sensitive data: who, what route, with which outcome. Never the request body.
 */
function recordAdminRequest(req, method, routePath, policy, result, status) {
  const actor = req.adminUser || {};
  if (method === "GET") {
    // A dashboard that polls would write the same line every few seconds.
    const key = `${actor.userId || actor.id}|${routePath}|${result}`;
    const now = Date.now();
    if ((recentReads.get(key) || 0) > now - READ_REPEAT_WINDOW_MS) return;
    recentReads.set(key, now);
    if (recentReads.size > 2000) {
      for (const [entry, at] of recentReads) if (at <= now - READ_REPEAT_WINDOW_MS) recentReads.delete(entry);
    }
  }
  const params = {};
  for (const [name, value] of Object.entries(req.params || {})) {
    params[name] = String(value).replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 120);
  }
  try {
    require("./coreAudit").logAuditFromRequest(req, {
      action: `${method} ${routePath}`,
      entityType: "route",
      entityId: Object.values(params)[0] || null,
      result,
      metadata: {
        kind: method === "GET" ? "read" : "write",
        status,
        permission: policy.permission || null,
        params: Object.keys(params).length ? params : undefined,
      },
    });
  } catch (err) {
    // The answer is already on its way; the failure must at least be visible to the operator.
    console.error(`[audit] could not record ${method} ${routePath}: ${err.code || err.message}`);
  }
}

/**
 * The entry is written before the answer leaves: a caller never holds a
 * confirmation for a change that the audit log does not know about.
 */
function auditBeforeAnswer(req, res, method, routePath, policy) {
  let done = false;
  const write = (status) => {
    if (done) return;
    done = true;
    // A handler that writes its own, more specific entry says so.
    if (req.auditHandled === true) return;
    recordAdminRequest(req, method, routePath, policy, resultOf(status), status);
  };
  const end = res.end;
  res.end = function auditedEnd(...args) {
    write(res.statusCode);
    return end.apply(this, args);
  };
  // The connection went away before the handler answered.
  res.once("close", () => write(res.writableEnded ? res.statusCode : 0));
}

/**
 * A webhook has no user session. The request is admitted by its signature;
 * the handler only runs for an authentic, fresh, first-time event.
 */
function webhookHandler(scope, routePath, handler) {
  const webhookGate = require("./webhookGate");
  const { logSecurityEvent } = require("./securityLog");
  const { getClientIp } = require("./security");

  return function signedWebhookHandler(req, res) {
    const verdict = webhookGate.admit(req, scope);
    if (!verdict.ok) {
      // The limiter answer is not logged per request: that would let a flood fill the log.
      if (verdict.status !== 429) {
        logSecurityEvent({
          type: "webhook_rejected",
          success: false,
          ip: getClientIp(req),
          path: routePath,
          detail: { scope, reason: verdict.reason },
        });
      }
      res.status(verdict.status).json({ success: false, errorKey: verdict.errorKey });
      return undefined;
    }

    if (verdict.duplicate) {
      logSecurityEvent({
        type: "webhook_duplicate",
        ip: getClientIp(req),
        path: routePath,
        detail: { scope, eventId: verdict.eventId },
      });
      res.status(200).json({ success: true, duplicate: true });
      return undefined;
    }

    req.webhook = { verified: true, scope, eventId: verdict.eventId, timestamp: verdict.timestamp };
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      const status = res.writableFinished ? res.statusCode : 0;
      webhookGate.settle(verdict.receiptId, status);
      logSecurityEvent({
        type: "webhook_accepted",
        success: status >= 200 && status < 300,
        ip: getClientIp(req),
        path: routePath,
        detail: { scope, eventId: verdict.eventId, status },
      });
    };
    res.once("finish", settle);
    res.once("close", settle);
    return handler(req, res);
  };
}

function requireAnyAdmin(req, res) {
  const identity = authFacade.requireAuth(req, res, { realm: "admin" });
  return identity ? req.adminUser : null;
}

module.exports = {
  wrapRouteHandler,
  requireAnyAdmin,
};
