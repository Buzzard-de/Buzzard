/**
 * Phase B — Feature-flagged bridge to compiled @pusat/ai-runtime (ESM dist only).
 * Default OFF (PUSAT_RUNTIME_ENABLED !== "1"). Does not replace Python/Node orchestrators.
 */

const path = require("path");
const { pathToFileURL } = require("url");
const policyAdapter = require("./pusatPolicyAdapter");

let runtimeModulePromise = null;
let runtimeInstancePromise = null;

function isPusatRuntimeEnabled() {
  return process.env.PUSAT_RUNTIME_ENABLED === "1";
}

/**
 * Prefer existing request correlation (middleware / X-Correlation-Id); do not invent parallel IDs when req is present.
 */
function resolveCorrelationId({ req, correlationId } = {}) {
  if (correlationId) return correlationId;
  if (req?.correlationId) return req.correlationId;
  const correlationContext = require("./operations/correlationContext");
  return correlationContext.newCorrelationId();
}

function bindRequestCorrelation(req, correlationId) {
  if (!req || !correlationId) return correlationId;
  req.correlationId = correlationId;
  if (req.operationsContext) {
    req.operationsContext.correlationId = correlationId;
  }
  return correlationId;
}

async function loadPusatRuntimeModule() {
  if (!isPusatRuntimeEnabled()) {
    throw new Error("PUSAT_RUNTIME_DISABLED");
  }
  if (!runtimeModulePromise) {
    const distPath = path.join(__dirname, "../../pusat-ai-runtime/dist/src/index.js");
    runtimeModulePromise = import(pathToFileURL(distPath).href);
  }
  return runtimeModulePromise;
}

async function getPusatRuntime() {
  if (!isPusatRuntimeEnabled()) {
    return null;
  }
  if (!runtimeInstancePromise) {
    runtimeInstancePromise = loadPusatRuntimeModule().then((mod) => mod.createPusatRuntime());
  }
  return runtimeInstancePromise;
}

function blockedResult({ correlationId, errorCode, errorMessage, extra }) {
  return {
    taskId: null,
    correlationId,
    status: "BLOCKED",
    errorCode,
    errorMessage,
    ...(extra || {}),
  };
}

/**
 * Dispatch a Pusat task through the in-memory Pusat orchestrator (stubs) with Buzzard policy/audit wiring.
 * Phase B: read-only actions only; side effects stop at bridge + controlCenter approval record.
 */
async function dispatchPusatTask(options = {}) {
  if (!isPusatRuntimeEnabled()) {
    return blockedResult({
      correlationId: resolveCorrelationId(options),
      errorCode: "PUSAT_RUNTIME_DISABLED",
      errorMessage: "Pusat runtime bridge is disabled (PUSAT_RUNTIME_ENABLED != 1).",
    });
  }

  const {
    req,
    action,
    targetAi,
    sourceAi = "voice-ai",
    payload = {},
    idempotencyKey,
    permissions = ["ai.read"],
    timeoutMs = 5000,
  } = options;

  const correlationId = bindRequestCorrelation(req, resolveCorrelationId(options));

  policyAdapter.mirrorAuditEvent({
    correlationId,
    actor: sourceAi,
    action,
    outcome: "DISPATCH_REQUEST",
    metadata: { targetAi, idempotencyKey: idempotencyKey || null },
  });

  if (!policyAdapter.isReadOnlyAction(action)) {
    let approval = null;
    if (
      policyAdapter.isWriteOrSideEffectAction(action) ||
      policyAdapter.requiresBuzzardApprovalRecord(action)
    ) {
      approval = policyAdapter.mapHumanApprovalToControlCenter({
        correlationId,
        action,
        reason: "Phase B bridge allows read-only actions only; side effects require human approval.",
        sessionId: payload?.sessionId,
        payload,
      });
    }
    policyAdapter.mirrorAuditEvent({
      correlationId,
      actor: "pusat-bridge",
      action,
      outcome: "BLOCKED",
      metadata: { reason: "not_read_only", approvalId: approval?.id || null },
    });
    return blockedResult({
      correlationId,
      errorCode: policyAdapter.requiresBuzzardApprovalRecord(action)
        ? "HUMAN_APPROVAL_REQUIRED"
        : "ACTION_NOT_ALLOWED",
      errorMessage: "Only read-only Pusat actions are permitted in Phase B.",
      extra: { approvalId: approval?.id || null },
    });
  }

  const authorizationScope = policyAdapter.buildAuthorizationScopes(action, permissions);
  if (!authorizationScope.length) {
    policyAdapter.mirrorAuditEvent({
      correlationId,
      actor: "pusat-bridge",
      action,
      outcome: "BLOCKED",
      metadata: { reason: "insufficient_permissions" },
    });
    return blockedResult({
      correlationId,
      errorCode: "NOT_AUTHORIZED",
      errorMessage: "Insufficient Buzzard AI permissions for this read-only action.",
    });
  }

  const runtime = await getPusatRuntime();
  const dispatchInput = {
    correlationId,
    sourceAi,
    targetAi: targetAi || "order-ai",
    action,
    payload,
    idempotencyKey: idempotencyKey || `${action}:${correlationId}:${JSON.stringify(payload).slice(0, 64)}`,
    authorizationScope,
    timeoutMs,
  };

  let result;
  try {
    result = await runtime.orchestrator.dispatch(dispatchInput);
  } catch (error) {
    policyAdapter.mirrorAuditEvent({
      correlationId,
      actor: "pusat-bridge",
      action,
      outcome: "FAILED",
      metadata: { error: error.message },
    });
    return blockedResult({
      correlationId,
      errorCode: "RUNTIME_ERROR",
      errorMessage: error.message,
    });
  }

  if (result.errorCode === "HUMAN_APPROVAL_REQUIRED") {
    const approval = policyAdapter.mapHumanApprovalToControlCenter({
      correlationId,
      action,
      reason: result.errorMessage,
      sessionId: payload?.sessionId,
      payload,
    });
    result = { ...result, approvalId: approval?.id || null };
  }

  const buzzardRead = await policyAdapter.executeReadOnlyBuzzardAction(action, payload);
  if (buzzardRead && result.status === "SUCCESS") {
    result = {
      ...result,
      result: {
        ...(result.result && typeof result.result === "object" ? result.result : {}),
        buzzardRead,
      },
    };
  }

  policyAdapter.mirrorAuditEvent({
    correlationId,
    actor: targetAi || "pusat-orchestrator",
    action,
    outcome: result.status,
    metadata: { taskId: result.taskId, errorCode: result.errorCode || null },
  });

  return result;
}

/** Test hook — clears cached ESM runtime */
function resetPusatRuntimeCacheForTests() {
  runtimeModulePromise = null;
  runtimeInstancePromise = null;
}

module.exports = {
  isPusatRuntimeEnabled,
  resolveCorrelationId,
  bindRequestCorrelation,
  getPusatRuntime,
  dispatchPusatTask,
  resetPusatRuntimeCacheForTests,
};
