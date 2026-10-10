/**
 * Admin HTTP entry for the Buzzard-owned orchestration facade.
 * Does not process tasks, call Pusat, or own persistence.
 */

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const orchestrationFacade = require("../lib/orchestrationFacade");

function attachAdmin(req, res) {
  if (req.adminUser && req.adminUser.role) return req.adminUser;
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
  return session;
}

function httpStatusFor(result) {
  if (!result) return 500;
  if (result.status === "DISABLED" || result.errorCode === "ORCHESTRATION_FACADE_DISABLED") return 503;
  if (result.errorCode === "NOT_AUTHORIZED") return 403;
  if (result.errorCode === "ACTION_NOT_ALLOWED" || result.errorCode === "DELEGATE_NOT_ALLOWED") return 403;
  if (result.status === "NOT_IMPLEMENTED" || result.errorCode === "NOT_IMPLEMENTED") return 501;
  if (result.status === "WAITING_APPROVAL") return 202;
  if (result.status === "SUCCESS" || result.status === "REPLAY") return 200;
  if (result.errorCode === "GET_ORDER_FAILED") return 404;
  if (result.errorCode === "IDEMPOTENCY_KEY_REQUIRED" || result.errorCode === "ACTION_REQUIRED") return 400;
  if (result.errorCode === "INTERNAL_ERROR") return 500;
  return 400;
}

async function handleDispatch(req, res) {
  if (!attachAdmin(req, res)) return;
  if (!requirePermission(req, res, "ai.assign")) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const result = await orchestrationFacade.dispatch({
    req,
    action: body.action,
    idempotencyKey: body.idempotencyKey,
    payload: body.payload,
    targetEmployeeId: body.targetEmployeeId,
    delegate: body.delegate,
  });

  logAuditFromRequest(req, {
    action: "orchestration.dispatch",
    entityType: "orchestration_facade",
    entityId: result.taskId || result.correlationId || body.action || "dispatch",
    newValue: result.status,
  });

  res.status(httpStatusFor(result)).json({
    success: result.status === "SUCCESS" || result.status === "REPLAY" || result.status === "WAITING_APPROVAL",
    ...result,
  });
}

module.exports = {
  handleDispatch,
  httpStatusFor,
  register(app) {
    app.post("/api/admin/orchestration/dispatch", (req, res) => {
      Promise.resolve(handleDispatch(req, res)).catch((err) => {
        res.status(500).json({
          success: false,
          status: "FAILED",
          errorCode: "INTERNAL_ERROR",
          errorMessage: err.message,
        });
      });
    });
  },
};
