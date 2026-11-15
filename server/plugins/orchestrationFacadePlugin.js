/**
 * HTTP entry for the orchestration facade.
 * Auto-loaded by server.js. The facade flag stays off unless
 * BUZZARD_ORCHESTRATION_FACADE is exactly "1".
 * Assignment authority stays in the policy adapter. Writes stay in the
 * Human Approval Center. This plugin does not open the commerce database.
 */

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { logAuditFromRequest } = require("../lib/coreAudit");
const { createOrchestrationFacade } = require("../lib/orchestrationFacade");
const policyAdapter = require("../lib/pusatPolicyAdapter");

function attachAdmin(req, res) {
  if (req.adminUser && req.adminUser.role) return req.adminUser;
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email || null,
    name: session.name,
    role: session.role,
  };
  return session;
}

function httpStatusFor(result) {
  if (!result) return 500;
  if (result.status === "DISABLED" || result.errorCode === "ORCHESTRATION_FACADE_DISABLED") return 503;
  if (
    result.errorCode === "NOT_AUTHORIZED" ||
    result.errorCode === "ASSIGN_TASK_DENIED" ||
    result.errorCode === "UNKNOWN_AGENT" ||
    result.errorCode === "DELEGATE_NOT_ALLOWED"
  ) {
    return 403;
  }
  if (result.status === "NOT_IMPLEMENTED" || result.errorCode === "NOT_IMPLEMENTED") return 501;
  if (result.status === "WAITING_APPROVAL") return 202;
  if (result.status === "SUCCESS" || result.status === "ASSIGNED") return 200;
  if (result.errorCode === "GET_ORDER_FAILED") return 404;
  if (result.errorCode === "IDEMPOTENCY_KEY_REQUIRED" || result.errorCode === "ACTION_REQUIRED") return 400;
  return 400;
}

function createOrchestrationFacadePlugin(options = {}) {
  const facade = options.facade || createOrchestrationFacade({
    enabled: options.enabled,
    approvalDbPath: options.approvalDbPath,
  });

  async function handleDispatch(req, res) {
    if (!attachAdmin(req, res)) return;
    if (!requirePermission(req, res, "ai.assign")) return;

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const action = String(body.action || "").trim().toUpperCase();
    if (action === "ASSIGN_TASK") {
      const authority = policyAdapter.assignmentAuthority(body.fromId);
      if (!authority.assignAllowed || authority.agentId !== "pusat") {
        const denied = {
          success: false,
          ok: false,
          status: "FAILED",
          errorCode: authority.errorCode || "ASSIGN_TASK_DENIED",
          agentId: authority.agentId,
          assigned: false,
          salesOpen: false,
          egressAllowed: false,
          productionReady: false,
          moneyMoved: false,
          purchased: false,
          refunded: false,
          shipmentCreated: false,
        };
        res.status(403).json(denied);
        return;
      }
    }

    const result = await facade.dispatch({
      action: body.action,
      idempotencyKey: body.idempotencyKey,
      payload: body.payload,
      agentId: body.agentId,
      fromId: body.fromId,
      assigneeId: body.assigneeId,
      title: body.title,
      delegate: body.delegate,
      correlationId: body.correlationId || req.correlationId,
    });

    logAuditFromRequest(req, {
      action: "orchestration.dispatch",
      entityType: "orchestration_facade",
      entityId: result.taskId || result.correlationId || action || "dispatch",
      newValue: result.status,
    });

    res.status(httpStatusFor(result)).json({
      success: result.status === "SUCCESS" || result.status === "ASSIGNED" || result.status === "WAITING_APPROVAL",
      ...result,
    });
  }

  return {
    handleDispatch,
    httpStatusFor,
    facade,
    close() {
      facade.close();
    },
    register(app) {
      app.post("/api/admin/orchestration/dispatch", (req, res) => {
        Promise.resolve(handleDispatch(req, res)).catch(() => {
          if (res.headersSent) return;
          res.status(500).json({
            success: false,
            status: "FAILED",
            errorCode: "INTERNAL_ERROR",
            salesOpen: false,
            egressAllowed: false,
            productionReady: false,
            errorMessage: "Dispatch failed.",
          });
        });
      });
    },
  };
}

const plugin = createOrchestrationFacadePlugin();
plugin.createOrchestrationFacadePlugin = createOrchestrationFacadePlugin;

module.exports = plugin;
