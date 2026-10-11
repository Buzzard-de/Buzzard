/**
 * Buzzard-owned orchestration composer (Phase C MVP).
 * Not a processor, not a SoT, not a Pusat/Python orchestrator.
 *
 * Enabled only when BUZZARD_ORCHESTRATION_FACADE === "1" (default OFF).
 * Does not load the Pusat runtime bridge. PUSAT_RUNTIME_ENABLED stays unused/OFF.
 */

const { db } = require("./db");
const controlCenter = require("./controlCenter");
const { can } = require("./rbac");
const policyAdapter = require("./pusatPolicyAdapter");
const correlationContext = require("./operations/correlationContext");

const REQUIRED_PERMISSION = "ai.assign";
const MIN_IDEMPOTENCY_KEY_LENGTH = 8;

const NOT_IMPLEMENTED_READ_ACTIONS = new Set([
  "CHECK_AVAILABILITY",
  "GET_PRODUCT",
  "CHECK_VARIANT",
  "IDENTIFY_CUSTOMER",
  "CHECK_RETURN_POLICY",
  "CHECK_PRICE",
  "CHECK_SUPPLIER",
]);

const WRITE_OR_APPROVAL_ACTIONS = policyAdapter.WRITE_SIDE_EFFECT_ACTIONS;

function isOrchestrationFacadeEnabled() {
  return process.env.BUZZARD_ORCHESTRATION_FACADE === "1";
}

function isPusatRuntimeEnabled() {
  return process.env.PUSAT_RUNTIME_ENABLED === "1";
}

function resolveCorrelationId(req) {
  if (req && req.correlationId) return req.correlationId;
  return correlationContext.newCorrelationId();
}

function parseJson(val, fallback) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function buildResponse({
  taskId = null,
  correlationId,
  status,
  replay = false,
  approvalId = null,
  result = {},
  errorCode = null,
  errorMessage = null,
}) {
  return {
    taskId,
    correlationId,
    status,
    replay,
    approvalId,
    result: result && typeof result === "object" ? result : {},
    errorCode,
    errorMessage,
  };
}

function findTaskByIdempotencyKey(idempotencyKey) {
  return db
    .prepare(
      `SELECT id, status, result_json, payload_json
       FROM core_ai_tasks
       WHERE json_extract(payload_json, '$.idempotencyKey') = ?`
    )
    .get(idempotencyKey);
}

function audit({ eventType, actorId, resourceId, summary, metadata }) {
  controlCenter.recordSystemEvent({
    eventType,
    actorType: "admin",
    actorId: actorId || null,
    resourceType: "orchestration_facade",
    resourceId: resourceId || metadata?.action || "dispatch",
    summary,
    metadata,
  });
}

/**
 * Interim GET_ORDER SoT: phoneAssistant → aiChatService → orders.json
 * Future OMS swap belongs in pusatPolicyAdapter.executeReadOnlyBuzzardAction only.
 */
async function executeGetOrder(payload) {
  return policyAdapter.executeReadOnlyBuzzardAction("GET_ORDER", payload);
}

function findApprovalIdForTask(taskId) {
  const row = db
    .prepare(`SELECT id FROM core_approvals WHERE task_id = ? ORDER BY created_at DESC`)
    .get(taskId);
  return row ? row.id : null;
}

function replayFromRow(row, correlationId, extraResult) {
  const payload = parseJson(row.payload_json, {});
  const storedResult = parseJson(row.result_json, {});
  return buildResponse({
    taskId: row.id,
    correlationId: payload.correlationId || correlationId,
    status: "REPLAY",
    replay: true,
    approvalId: findApprovalIdForTask(row.id) || storedResult.approvalId || null,
    result: extraResult && Object.keys(extraResult).length ? extraResult : storedResult,
    errorCode: null,
    errorMessage: null,
  });
}

function assertCallerAuthorized(req) {
  if (!req || !req.adminUser) {
    return { ok: false, errorCode: "NOT_AUTHORIZED", errorMessage: "Admin identity required." };
  }
  if (!can(req.adminUser.role, REQUIRED_PERMISSION)) {
    return { ok: false, errorCode: "NOT_AUTHORIZED", errorMessage: `Missing permission: ${REQUIRED_PERMISSION}` };
  }
  return { ok: true };
}

async function dispatch(input = {}) {
  const req = input.req;
  const action = input.action;
  const idempotencyKey = input.idempotencyKey;
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const targetEmployeeId = input.targetEmployeeId || null;
  const delegate = input.delegate;
  const correlationId = resolveCorrelationId(req);
  const actorId = req && req.adminUser ? req.adminUser.email : null;

  if (!isOrchestrationFacadeEnabled()) {
    return buildResponse({
      correlationId,
      status: "DISABLED",
      errorCode: "ORCHESTRATION_FACADE_DISABLED",
      errorMessage: "Orchestration facade is disabled (BUZZARD_ORCHESTRATION_FACADE != 1).",
    });
  }

  if (!action) {
    return buildResponse({
      correlationId,
      status: "FAILED",
      errorCode: "ACTION_REQUIRED",
      errorMessage: "action is required.",
    });
  }

  if (!idempotencyKey || String(idempotencyKey).length < MIN_IDEMPOTENCY_KEY_LENGTH) {
    return buildResponse({
      correlationId,
      status: "FAILED",
      errorCode: "IDEMPOTENCY_KEY_REQUIRED",
      errorMessage: "idempotencyKey is required (min 8 characters, caller-supplied, stable).",
    });
  }

  if (delegate != null && delegate !== "none") {
    return buildResponse({
      correlationId,
      status: "FAILED",
      errorCode: "DELEGATE_NOT_ALLOWED",
      errorMessage: "MVP delegate must be omitted or \"none\". Python/Pusat delegates are out of scope.",
    });
  }

  const auth = assertCallerAuthorized(req);
  if (!auth.ok) {
    audit({
      eventType: "orchestration.blocked",
      actorId,
      resourceId: action,
      summary: `Orchestration denied: ${action}`,
      metadata: { correlationId, action, idempotencyKey, errorCode: auth.errorCode },
    });
    return buildResponse({
      correlationId,
      status: "FAILED",
      errorCode: auth.errorCode,
      errorMessage: auth.errorMessage,
    });
  }

  if (NOT_IMPLEMENTED_READ_ACTIONS.has(action)) {
    audit({
      eventType: "orchestration.blocked",
      actorId,
      resourceId: action,
      summary: `Orchestration not implemented: ${action}`,
      metadata: { correlationId, action, idempotencyKey, errorCode: "NOT_IMPLEMENTED" },
    });
    return buildResponse({
      correlationId,
      status: "NOT_IMPLEMENTED",
      errorCode: "NOT_IMPLEMENTED",
      errorMessage: `No real Buzzard adapter for ${action}.`,
    });
  }

  if (WRITE_OR_APPROVAL_ACTIONS.has(action)) {
    const existing = findTaskByIdempotencyKey(idempotencyKey);
    if (existing) {
      audit({
        eventType: "orchestration.replay",
        actorId,
        resourceId: existing.id,
        summary: `Orchestration replay: ${action}`,
        metadata: { correlationId, action, idempotencyKey, taskId: existing.id },
      });
      return replayFromRow(existing, correlationId);
    }

    try {
      const task = controlCenter.createAiTask({
        title: `orchestration:${action}`,
        description: "Human approval required. No production side effect executed by facade.",
        employeeId: targetEmployeeId || undefined,
        permissionsRequired: ["ai.read"],
        payload: {
          ...payload,
          action,
          idempotencyKey,
          correlationId,
          requiresApproval: true,
        },
        createdBy: actorId,
      });

      const approval = controlCenter.createApproval({
        taskId: task.id,
        resourceType: "orchestration_facade",
        resourceId: action,
        aiRecommendation: `Facade blocked "${action}". No payment/order/marketplace mutation.`,
        reason: `HUMAN_APPROVAL_REQUIRED:${action}`,
        riskLevel: "HIGH",
      });

      audit({
        eventType: "orchestration.dispatch",
        actorId,
        resourceId: task.id,
        summary: `Orchestration waiting approval: ${action}`,
        metadata: {
          correlationId,
          action,
          idempotencyKey,
          taskId: task.id,
          approvalId: approval.id,
        },
      });

      return buildResponse({
        taskId: task.id,
        correlationId,
        status: "WAITING_APPROVAL",
        approvalId: approval.id,
        result: { blocked: true, sideEffectExecuted: false },
        errorCode: "HUMAN_APPROVAL_REQUIRED",
        errorMessage: `Action ${action} requires Buzzard core_approvals. No side effect executed.`,
      });
    } catch (err) {
      return buildResponse({
        correlationId,
        status: "FAILED",
        errorCode: "INTERNAL_ERROR",
        errorMessage: err.message,
      });
    }
  }

  if (action !== "GET_ORDER") {
    audit({
      eventType: "orchestration.blocked",
      actorId,
      resourceId: action,
      summary: `Orchestration unknown action: ${action}`,
      metadata: { correlationId, action, idempotencyKey, errorCode: "ACTION_NOT_ALLOWED" },
    });
    return buildResponse({
      correlationId,
      status: "FAILED",
      errorCode: "ACTION_NOT_ALLOWED",
      errorMessage: `Unknown or denied action: ${action}`,
    });
  }

  const existing = findTaskByIdempotencyKey(idempotencyKey);
  if (existing) {
    const storedResult = parseJson(existing.result_json, {});
    let extraResult = storedResult;
    if (!storedResult || !Object.keys(storedResult).length) {
      extraResult = await executeGetOrder(payload);
    }
    audit({
      eventType: "orchestration.replay",
      actorId,
      resourceId: existing.id,
      summary: "Orchestration replay: GET_ORDER",
      metadata: { correlationId, action, idempotencyKey, taskId: existing.id },
    });
    return replayFromRow(existing, correlationId, extraResult);
  }

  try {
    const adapterResult = await executeGetOrder(payload);
    const ok = Boolean(adapterResult && adapterResult.ok === true);

    const task = controlCenter.createAiTask({
      title: "orchestration:GET_ORDER",
      description: "Read-only order lookup via existing phone assistant adapter.",
      employeeId: targetEmployeeId || undefined,
      permissionsRequired: ["ai.read"],
      payload: {
        ...payload,
        action,
        idempotencyKey,
        correlationId,
      },
      createdBy: actorId,
    });

    controlCenter.updateTaskStatus(task.id, ok ? "COMPLETED" : "FAILED", {
      result: adapterResult || {},
      error: ok ? undefined : (adapterResult && adapterResult.errorKey) || "GET_ORDER_FAILED",
    });

    // Record exists in core_ai_tasks. processTask is not a GET_ORDER adapter;
    // enqueueing would re-run the AI provider and overwrite the read result.
    // Processing ownership remains aiOrchestrator for tasks it is meant to execute.

    audit({
      eventType: "orchestration.dispatch",
      actorId,
      resourceId: task.id,
      summary: ok ? "Orchestration GET_ORDER success" : "Orchestration GET_ORDER failed",
      metadata: {
        correlationId,
        action,
        idempotencyKey,
        taskId: task.id,
        errorCode: ok ? null : "GET_ORDER_FAILED",
      },
    });

    if (!ok) {
      return buildResponse({
        taskId: task.id,
        correlationId,
        status: "FAILED",
        result: adapterResult || {},
        errorCode: "GET_ORDER_FAILED",
        errorMessage: (adapterResult && adapterResult.errorKey) || "GET_ORDER failed.",
      });
    }

    return buildResponse({
      taskId: task.id,
      correlationId,
      status: "SUCCESS",
      result: adapterResult,
    });
  } catch (err) {
    return buildResponse({
      correlationId,
      status: "FAILED",
      errorCode: "INTERNAL_ERROR",
      errorMessage: err.message,
    });
  }
}

module.exports = {
  REQUIRED_PERMISSION,
  NOT_IMPLEMENTED_READ_ACTIONS,
  dispatch,
  isOrchestrationFacadeEnabled,
  isPusatRuntimeEnabled,
  resolveCorrelationId,
  findTaskByIdempotencyKey,
};
