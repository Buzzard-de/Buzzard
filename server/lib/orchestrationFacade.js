/**
 * Orchestration facade.
 * Buzzard stays the order source. Pusat is the only assigner.
 * Tasks go through the in-memory Task Router. Approvals go through
 * the Human Approval Center. This module does not write core_ai_tasks
 * or core_approvals and does not start a payment, purchase, refund, or shipment.
 */

const path = require("path");
const policyAdapter = require("./pusatPolicyAdapter");
const { createRouter } = require("./buzzardNative/core/taskRouter");
const { createApprovalCenter } = require("./pusat/humanApproval");
const correlationContext = require("./operations/correlationContext");

const MIN_IDEMPOTENCY_KEY_LENGTH = 8;

function commerceClosed() {
  return {
    executed: false,
    purchased: false,
    moneyMoved: false,
    refunded: false,
    shipmentCreated: false,
    orderChanged: false,
    salesOpen: false,
    egressAllowed: false,
    productionReady: false,
  };
}

function base(extra) {
  return {
    ok: false,
    approvalCreated: false,
    taskCreated: false,
    coreTaskCreated: false,
    coreApprovalCreated: false,
    stored: false,
    sideEffectExecuted: false,
    autoEligible: false,
    auto: false,
    permissionIncreased: false,
    identitiesMerged: false,
    parallelTaskQueue: false,
    parallelApproval: false,
    ...commerceClosed(),
    ...extra,
  };
}

function isDataPathRefused(dbPath) {
  if (!dbPath) return false;
  const resolved = path.resolve(dbPath);
  const baseName = path.basename(resolved);
  if (baseName === "buzzard.db" || baseName.startsWith("buzzard_guardian")) return true;
  if (resolved.includes(`${path.sep}server${path.sep}data${path.sep}`)) return true;
  return false;
}

function containsCardNumber(value) {
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (typeof current === "string" && /^\d{13,19}$/.test(current.replace(/[\s-]/g, ""))) return true;
    if (current && typeof current === "object") stack.push(...Object.values(current));
  }
  return false;
}

function createOrchestrationFacade({
  enabled,
  router = null,
  approvalCenter = null,
  approvalDbPath = null,
  policy = policyAdapter,
} = {}) {
  const taskRouter = router || createRouter();
  let center = approvalCenter || null;
  let openedHere = false;

  function enabledNow() {
    if (enabled === true) return true;
    if (enabled === false) return false;
    return process.env.BUZZARD_ORCHESTRATION_FACADE === "1";
  }

  function disabled(correlationId) {
    return base({
      status: "DISABLED",
      errorCode: "ORCHESTRATION_FACADE_DISABLED",
      correlationId: correlationId || null,
    });
  }

  function openCenter() {
    if (center) return { ok: true, center };
    if (isDataPathRefused(approvalDbPath)) {
      return { ok: false, errorCode: "DATA_PATH_REFUSED" };
    }
    center = approvalDbPath
      ? createApprovalCenter({ dbPath: path.resolve(approvalDbPath) })
      : createApprovalCenter();
    openedHere = true;
    return { ok: true, center };
  }

  function assignTask(input, correlationId) {
    const requestedFrom = input.fromId || "pusat";
    const authority = policy.assignmentAuthority(requestedFrom);
    if (!authority.assignAllowed || authority.agentId !== "pusat") {
      return base({
        status: "FAILED",
        errorCode: authority.errorCode || "ASSIGN_TASK_DENIED",
        identityCode: authority.identityCode || null,
        correlationId,
        agentId: authority.agentId || null,
        assigned: false,
      });
    }
    const routed = taskRouter.assignNew({
      fromId: "pusat",
      assigneeId: input.assigneeId,
      title: input.title || "facade assignment",
    });
    if (!routed.ok) {
      return base({
        status: "FAILED",
        errorCode: routed.code || "ASSIGN_TASK_DENIED",
        correlationId,
        agentId: "pusat",
        assigned: false,
      });
    }
    return base({
      ok: true,
      status: "ASSIGNED",
      errorCode: null,
      correlationId,
      taskId: routed.taskId,
      agentId: "pusat",
      assigneeId: routed.receiver,
      assigned: true,
      taskCreated: false,
      routerAssigned: true,
    });
  }

  function submitApproval(mapped, input, correlationId) {
    const idempotencyKey = String(input.idempotencyKey || "");
    if (idempotencyKey.length < MIN_IDEMPOTENCY_KEY_LENGTH) {
      return base({
        status: "FAILED",
        errorCode: "IDEMPOTENCY_KEY_REQUIRED",
        correlationId,
        action: mapped.action,
      });
    }
    if (
      mapped.humanRequiredAction === "CREATE_REPORTS" ||
      mapped.autoEligible === true ||
      mapped.risk === "LOW" ||
      mapped.classification !== "HUMAN_REQUIRED"
    ) {
      return base({
        status: "FAILED",
        errorCode: "AUTO_APPROVAL_DENIED",
        correlationId,
        action: mapped.action,
      });
    }
    if (containsCardNumber(idempotencyKey) || containsCardNumber(input.payload)) {
      return base({
        status: "FAILED",
        errorCode: "CARD_DATA_REJECTED",
        correlationId,
        action: mapped.action,
        agentId: mapped.agentId,
      });
    }
    const opened = openCenter();
    if (!opened.ok) {
      return base({ status: "FAILED", errorCode: opened.errorCode, correlationId, action: mapped.action });
    }
    const submitted = opened.center.submit({
      action: mapped.humanRequiredAction,
      requestedBy: "pusat",
      reason: `HUMAN_APPROVAL_REQUIRED:${mapped.humanRequiredAction}`,
      risk: "CRITICAL",
      taskId: `facade:${idempotencyKey}`,
      payload: {
        facadeAction: mapped.action,
        correlationId,
        idempotencyKey,
        ...commerceClosed(),
      },
    });
    if (submitted.auto === true || submitted.item?.auto === true || submitted.item?.status === "APPROVED") {
      return base({
        status: "FAILED",
        errorCode: "AUTO_APPROVAL_DENIED",
        correlationId,
        action: mapped.action,
        humanRequiredAction: mapped.humanRequiredAction,
      });
    }
    const waiting = submitted.item?.status === "WAITING_APPROVAL";
    return base({
      ok: waiting,
      status: waiting ? "WAITING_APPROVAL" : "FAILED",
      errorCode: waiting ? "HUMAN_APPROVAL_REQUIRED" : submitted.code || "APPROVAL_NOT_RECORDED",
      correlationId,
      action: mapped.action,
      humanRequiredAction: mapped.humanRequiredAction,
      classification: submitted.classification || mapped.classification,
      risk: submitted.risk || "CRITICAL",
      approvalId: submitted.item?.id || null,
      taskId: submitted.item?.task_id || `facade:${idempotencyKey}`,
      agentId: "pusat",
      replay: submitted.duplicate === true,
      approvalCreated: waiting && submitted.duplicate !== true,
      stored: waiting,
    });
  }

  async function dispatch(input = {}) {
    const correlationId = input.correlationId || correlationContext.newCorrelationId();
    if (!enabledNow()) return disabled(correlationId);
    if (input.delegate != null && input.delegate !== "none") {
      return base({
        status: "FAILED",
        errorCode: "DELEGATE_NOT_ALLOWED",
        correlationId,
      });
    }
    const action = String(input.action || "").trim().toUpperCase();
    if (!action) {
      return base({ status: "FAILED", errorCode: "ACTION_REQUIRED", correlationId });
    }
    if (action === "GET_ORDER") {
      const read = await policy.executeReadOnlyBuzzardAction("GET_ORDER", input.payload, {
        agentId: input.agentId,
      });
      return base({
        ...read,
        correlationId,
        approvalCreated: false,
        taskCreated: false,
        stored: false,
        coreTaskCreated: false,
        coreApprovalCreated: false,
      });
    }
    if (action === "ASSIGN_TASK") return assignTask(input, correlationId);

    const mapped = policy.mapFacadeAction({
      action,
      agentId: input.agentId,
      payload: input.payload,
    });
    if (mapped.status !== "MAPPED") {
      return base({ ...mapped, correlationId, approvalCreated: false, stored: false });
    }
    return submitApproval(mapped, input, correlationId);
  }

  function decideHumanApproval({ id, approved, actorId, correlationId } = {}) {
    const corr = correlationId || correlationContext.newCorrelationId();
    if (!enabledNow()) return disabled(corr);
    const opened = openCenter();
    if (!opened.ok) return base({ status: "FAILED", errorCode: opened.errorCode, correlationId: corr });
    const decision = opened.center.decide({ id, approved, actorId });
    return base({
      ...decision,
      ok: decision.ok === true,
      status: decision.item?.status || "FAILED",
      errorCode: decision.ok ? null : decision.code || "PERMISSION_DENIED",
      correlationId: corr,
      approvalId: id,
      commercialExecuted: false,
    });
  }

  function close() {
    if (openedHere && center) center.close();
    center = approvalCenter || null;
    openedHere = false;
  }

  return {
    dispatch,
    decideHumanApproval,
    close,
    router: taskRouter,
  };
}

module.exports = { createOrchestrationFacade };
