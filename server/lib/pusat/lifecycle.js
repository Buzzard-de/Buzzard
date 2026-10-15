/**
 * Pusat task lifecycle — guardian, approval, timeout, agent dispatch, exceptions.
 */

const { db } = require("../db");
const controlCenter = require("../controlCenter");
const { executeWithProvider, getActiveProvider } = require("../aiProviders");
const { TASK_STATUS, AI_EMPLOYEE_STATUS } = require("../../core/constants");
const guardian = require("./guardian");
const approval = require("./approval");
const exceptions = require("./exceptions");
const agents = require("./agents");
const memory = require("./memory");
const automations = require("./automations");
const { getMeta, upsertMeta } = require("./submit");
const { EXCEPTION_CODES, MEMORY_KIND, SENSITIVE_ACTIONS } = require("./constants");
const { publicTaskError } = require("../security");
const circuitBreaker = require("./circuitBreaker");
const esatSecurity = require("./esatSecurity");

function parseJson(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function loadTask(taskId) {
  const row = db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(taskId);
  if (!row) return null;
  return {
    ...row,
    payload: parseJson(row.payload_json, {}),
    permissions: parseJson(row.permissions_required_json, []),
  };
}

function isTimedOut(task, meta, now = Date.now()) {
  const stamp = meta?.timeout_at || task.timeout_at;
  if (!stamp) return false;
  return new Date(stamp).getTime() <= now;
}

async function withTimeout(promise, ms) {
  if (!ms || ms <= 0) return promise;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error("Task execution timed out");
      err.code = EXCEPTION_CODES.TASK_TIMEOUT;
      reject(err);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function executeTask(taskId, { skipEnqueueSideEffects = true } = {}) {
  agents.ensureSpecialistEmployees();
  const task = loadTask(taskId);
  if (!task) {
    return { ok: false, code: EXCEPTION_CODES.TASK_NOT_FOUND };
  }

  const meta = getMeta(taskId);
  const taskConflict = require("./taskConflict");
  const conflict = taskConflict.detect(task);
  if (conflict.blocked) {
    return {
      ok: false,
      status: task.status,
      code: "TASK_CONFLICT",
      reason: conflict.reason,
      otherTaskId: conflict.otherTaskId,
      executed: false,
    };
  }
  if (isTimedOut(task, meta)) {
    const handled = exceptions.handleFailure(
      { message: "Task timed out before execution", code: EXCEPTION_CODES.TASK_TIMEOUT },
      { taskId, correlationId: meta?.correlation_id, action: task.payload?.action }
    );
    upsertMeta(taskId, { classifiedAs: meta?.classified_as });
    db.prepare("UPDATE core_ai_task_meta SET failure_kind = ? WHERE task_id = ?").run("TIMEOUT", taskId);
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: "timeout",
      result: { failureKind: "TIMEOUT", exceptionId: handled.exception?.id },
    });
  }

  if (task.depends_on_task_id) {
    const dep = db.prepare("SELECT status FROM core_ai_tasks WHERE id = ?").get(task.depends_on_task_id);
    if (!dep || dep.status !== TASK_STATUS.COMPLETED) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.PENDING);
    }
  }

  const agentCode = meta?.agent_code || agents.classifyAgent(task.title, task.payload);
  const agentDef = agents.getAgent(agentCode);
  const employeeId = task.employee_id || agentDef?.employeeId;
  const employee = employeeId ? controlCenter.getAiEmployee(employeeId) : null;

  if (!employee || employee.status !== AI_EMPLOYEE_STATUS.ACTIVE) {
    const handled = exceptions.handleFailure(
      { message: "No eligible or active AI employee", code: EXCEPTION_CODES.AGENT_UNAVAILABLE },
      { taskId, correlationId: meta?.correlation_id }
    );
    controlCenter.createEscalation({
      sourceType: "ai_task",
      sourceId: taskId,
      title: "Agent unavailable",
      message: `Task ${task.title} has no active agent`,
      riskLevel: "HIGH",
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: "agent_unavailable",
      result: { failureKind: "AGENT_UNAVAILABLE", exceptionId: handled.exception?.id },
    });
  }

  const action = task.payload.action || agentCode;
  const gate = guardian.evaluate({
    agentId: employee.id,
    employee,
    action,
    tool: task.payload.tool,
    payload: task.payload,
    permissionsRequired: task.permissions,
    priority: task.priority,
  });

  if (!gate.allowed) {
    circuitBreaker.recordFailure(`pusat:${agentCode}`, db);
    exceptions.handleFailure(
      { message: gate.message, code: gate.code },
      { taskId, correlationId: meta?.correlation_id, action }
    );
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: publicTaskError({ code: gate.code }, "PUSAT_GUARDIAN_BLOCKED"),
      result: { failureKind: "GUARDIAN", guardian: gate },
    });
  }

  const circuit = circuitBreaker.allow(`pusat:${agentCode}`, { financial: esatSecurity.isMoneyAction(action) });
  if (!circuit.allowed) {
    exceptions.handleFailure(
      { message: circuit.reason || "CIRCUIT_OPEN", code: EXCEPTION_CODES.GUARDIAN_BLOCKED },
      { taskId, correlationId: meta?.correlation_id, action }
    );
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: publicTaskError({ code: EXCEPTION_CODES.GUARDIAN_BLOCKED }, EXCEPTION_CODES.GUARDIAN_BLOCKED),
      result: { failureKind: "CIRCUIT", circuit, executed: false },
    });
  }

  if (gate.requireApproval || task.payload.requiresApproval || task.priority === "CRITICAL") {
    const approvalReady = esatSecurity.wrapApprovalCall(() => {
      approval.expireDue();
      return { ok: true, existing: approval.latestForTask(taskId) };
    });
    if (!approvalReady.ok) {
      exceptions.handleFailure(
        { message: "Approval service unavailable", code: EXCEPTION_CODES.APPROVAL_INVALID },
        { taskId, correlationId: meta?.correlation_id, action }
      );
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
        error: publicTaskError({ code: EXCEPTION_CODES.APPROVAL_INVALID }, EXCEPTION_CODES.APPROVAL_INVALID),
        result: { failureKind: "APPROVAL_UNAVAILABLE", executed: false, failClosed: true },
      });
    }
    const existing = approvalReady.existing;
    if (existing && ["REJECTED", "CANCELLED", "EXECUTION_FAILED"].includes(existing.status)) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.CANCELLED, {
        error: `approval_${String(existing.status).toLowerCase()}`,
        result: {
          executed: false,
          approvalStatus: existing.status,
          reminted: false,
        },
      });
    }
    if (!existing || existing.status === "PENDING" || existing.status === "EXPIRED") {
      if (!existing || existing.status !== "PENDING") {
        approval.requestApproval({
          taskId,
          requestingAgent: employee.id,
          action,
          reason: task.title,
          input: task.payload,
          expectedSideEffects: task.payload.expectedSideEffects || [],
          riskLevel: task.priority === "CRITICAL" ? "CRITICAL" : "HIGH",
        });
      }
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.WAITING_APPROVAL);
    }
    const consumed = approval.consumeForExecution(existing.id, task.payload, {
      actor: existing.decidedBy,
    });
    if (!consumed.ok) {
      if (consumed.code === "already_executed") {
        return controlCenter.getAiTask(taskId);
      }
      exceptions.handleFailure(
        { message: `Approval invalid: ${consumed.code}`, code: EXCEPTION_CODES.APPROVAL_INVALID },
        { taskId, correlationId: meta?.correlation_id, action }
      );
      if (consumed.code === "input_changed") {
        approval.requestApproval({
          taskId,
          requestingAgent: employee.id,
          action,
          reason: "Renewed after input change",
          input: task.payload,
          expectedSideEffects: task.payload.expectedSideEffects || [],
        });
      }
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.WAITING_APPROVAL, {
        error: consumed.code,
      });
    }
  }

  controlCenter.updateTaskStatus(taskId, TASK_STATUS.RUNNING);
  memory.writeMemory({
    kind: MEMORY_KIND.TEMPORARY_TASK_STATE,
    subject: `task:${taskId}`,
    content: { status: "RUNNING", agentCode },
    source: "pusat.lifecycle",
    agentId: employee.id,
    taskId,
  });

  const remainingMs = meta?.timeout_at ? Math.max(1, new Date(meta.timeout_at).getTime() - Date.now()) : 25_000;

  try {
    let output;
    if (task.payload.automation) {
      output = automations.runAutomation(task.payload.automation, task.payload, { taskId, employee });
    } else if (agentDef) {
      output = await withTimeout(
        Promise.resolve(agents.executeAgent(agentCode, task.payload, { taskId, employee, agentId: employee.id })),
        remainingMs
      );
    } else {
      output = await withTimeout(
        executeWithProvider({
          provider: getActiveProvider(),
          prompt: task.title,
          context: { taskId, employeeId: employee.id, payload: task.payload },
        }),
        remainingMs
      );
    }

    if (output && output.ok === false && output.error === "schema_invalid") {
      throw Object.assign(new Error(output.errors?.join(", ") || "schema_invalid"), {
        code: EXCEPTION_CODES.VALIDATION_FAILED,
      });
    }

    db.prepare(
      `UPDATE core_ai_employees SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(employee.id);

    controlCenter.recordSystemEvent({
      eventType: "pusat.task.completed",
      actorType: "ai_employee",
      actorId: employee.id,
      resourceType: "ai_task",
      resourceId: taskId,
      summary: `Pusat completed: ${task.title}`,
      metadata: { agentCode },
    });

    memory.writeMemory({
      kind: MEMORY_KIND.HISTORICAL_RECORD,
      subject: `task:${taskId}`,
      content: { status: "COMPLETED", agentCode },
      source: "pusat.lifecycle",
      agentId: employee.id,
      taskId,
    });

    circuitBreaker.recordSuccess(`pusat:${agentCode}`, db);
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.COMPLETED, {
      result: { agentCode, output, skipEnqueueSideEffects },
    });
  } catch (error) {
    circuitBreaker.recordFailure(`pusat:${agentCode}`, db);
    const handled = exceptions.handleFailure(error, {
      taskId,
      correlationId: meta?.correlation_id,
      action,
      maxRetries: task.max_retries,
    });

    const retryCount = (task.retry_count || 0) + 1;
    db.prepare("UPDATE core_ai_tasks SET retry_count = ? WHERE id = ?").run(retryCount, taskId);

    if (SENSITIVE_ACTIONS.includes(action) || !handled.classified.retryable) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
        error: publicTaskError(error, handled.classified.code),
        result: { failureKind: handled.classified.code, exceptionId: handled.exception?.id, retryable: false },
      });
    }

    if (handled.retry.retry && retryCount < (task.max_retries || 3)) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.ASSIGNED, {
        error: publicTaskError(error, handled.classified.code),
        result: { failureKind: handled.classified.code, retry: true, delayMs: handled.retry.delayMs },
      });
    }

    exceptions.deadLetter(handled.exception.id, "retry_exhausted");
    controlCenter.createEscalation({
      sourceType: "ai_task",
      sourceId: taskId,
      title: "AI task failed after retries",
      message: task.title,
      riskLevel: "HIGH",
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: publicTaskError(error, handled.classified.code),
      result: { failureKind: handled.classified.code, exceptionId: handled.exception?.id },
    });
  }
}

function cancelTask(taskId, { cancelledBy, reason } = {}) {
  const task = loadTask(taskId);
  if (!task) {
    return { ok: false, code: EXCEPTION_CODES.TASK_NOT_FOUND, cancelled: false };
  }
  if (task.status === TASK_STATUS.COMPLETED) {
    return { ok: false, cancelled: false, alreadyComplete: true, status: task.status };
  }
  if (task.status === TASK_STATUS.CANCELLED) {
    return { ok: true, cancelled: true, alreadyTerminal: true, status: task.status, sideEffects: false };
  }
  const updated = controlCenter.updateTaskStatus(taskId, TASK_STATUS.CANCELLED, {
    error: reason || "cancelled",
    result: { cancelledBy: cancelledBy || null, sideEffects: false },
  });
  return {
    ok: true,
    cancelled: true,
    status: TASK_STATUS.CANCELLED,
    sideEffects: false,
    task: updated,
  };
}

function enqueueTask(taskId) {
  setImmediate(() => {
    executeTask(taskId).catch((err) => {
      const errorKey = publicTaskError(err, "ai.orchestrator.failed");
      console.error("[pusat.lifecycle]", { name: err?.name, code: err?.code });
      controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, { error: errorKey });
      controlCenter.createEscalation({
        sourceType: "ai_task",
        sourceId: taskId,
        title: "Pusat orchestrator error",
        message: errorKey,
        riskLevel: "CRITICAL",
      });
    });
  });
}

module.exports = {
  executeTask,
  enqueueTask,
  cancelTask,
  loadTask,
  isTimedOut,
};
