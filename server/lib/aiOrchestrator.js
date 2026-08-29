/**
 * Central AI task orchestrator — coordinates employees, permissions, retries, approvals.
 */

const { db } = require("./db");
const controlCenter = require("./controlCenter");
const { executeWithProvider, getActiveProvider } = require("./aiProviders");
const { TASK_STATUS, TASK_PRIORITY, RISK_LEVEL, AI_EMPLOYEE_STATUS } = require("../core/constants");
const { aiCanExecute } = require("./rbac");

function parseJson(val, fallback = {}) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function priorityWeight(priority) {
  const map = { CRITICAL: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
  return map[priority] || 2;
}

function selectEmployeeForTask(task) {
  if (task.employee_id) {
    return controlCenter.getAiEmployee(task.employee_id);
  }
  const required = parseJson(task.permissions_required_json, []);
  const employees = controlCenter.listAiEmployees().filter((e) => e.status === AI_EMPLOYEE_STATUS.ACTIVE);
  const eligible = employees.filter((emp) =>
    required.every((perm) => aiCanExecute(emp.permissions, perm))
  );
  if (!eligible.length) return null;
  eligible.sort((a, b) => b.priority - a.priority || priorityWeight(task.priority) - priorityWeight(task.priority));
  return eligible[0];
}

function taskRequiresApproval(task) {
  const payload = parseJson(task.payload_json, {});
  return Boolean(payload.requiresApproval) || task.priority === TASK_PRIORITY.CRITICAL;
}

async function processTask(taskId) {
  const row = db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(taskId);
  if (!row) return null;

  if (row.depends_on_task_id) {
    const dep = db.prepare("SELECT status FROM core_ai_tasks WHERE id = ?").get(row.depends_on_task_id);
    if (!dep || dep.status !== TASK_STATUS.COMPLETED) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.PENDING);
    }
  }

  const employee = selectEmployeeForTask(row);
  if (!employee) {
    controlCenter.createEscalation({
      sourceType: "ai_task",
      sourceId: taskId,
      title: "No eligible AI employee",
      message: `Task ${row.title} has no employee with required permissions`,
      riskLevel: RISK_LEVEL.HIGH,
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: "No eligible AI employee",
    });
  }

  const required = parseJson(row.permissions_required_json, []);
  for (const perm of required) {
    if (!aiCanExecute(employee.permissions, perm)) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
        error: `Permission denied: ${perm}`,
      });
    }
  }

  if (!row.employee_id) {
    db.prepare("UPDATE core_ai_tasks SET employee_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      employee.id,
      taskId
    );
  }

  if (taskRequiresApproval(row)) {
    controlCenter.createApproval({
      taskId,
      resourceType: "ai_task",
      resourceId: taskId,
      aiRecommendation: "Review before execution",
      reason: row.title,
      riskLevel: row.priority === TASK_PRIORITY.CRITICAL ? RISK_LEVEL.CRITICAL : RISK_LEVEL.MEDIUM,
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.WAITING_APPROVAL);
  }

  controlCenter.updateTaskStatus(taskId, TASK_STATUS.RUNNING);

  const providerResult = await executeWithProvider({
    provider: getActiveProvider(),
    prompt: row.title,
    context: {
      taskId,
      employeeId: employee.id,
      payload: parseJson(row.payload_json, {}),
    },
  });

  if (!providerResult.ok) {
    const retryCount = (row.retry_count || 0) + 1;
    db.prepare("UPDATE core_ai_tasks SET retry_count = ? WHERE id = ?").run(retryCount, taskId);
    if (retryCount < (row.max_retries || 3)) {
      return controlCenter.updateTaskStatus(taskId, TASK_STATUS.ASSIGNED, {
        error: providerResult.message || providerResult.error,
      });
    }
    controlCenter.createEscalation({
      sourceType: "ai_task",
      sourceId: taskId,
      title: "AI task failed after retries",
      message: row.title,
      riskLevel: RISK_LEVEL.HIGH,
    });
    return controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, {
      error: providerResult.message || providerResult.error,
    });
  }

  db.prepare(`
    UPDATE core_ai_employees SET last_activity_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(employee.id);

  controlCenter.recordSystemEvent({
    eventType: "ai.task.completed",
    actorType: "ai_employee",
    actorId: employee.id,
    resourceType: "ai_task",
    resourceId: taskId,
    summary: `Task completed: ${row.title}`,
  });

  return controlCenter.updateTaskStatus(taskId, TASK_STATUS.COMPLETED, {
    result: providerResult.output,
  });
}

function enqueueTaskProcessing(taskId) {
  setImmediate(() => {
    processTask(taskId).catch((err) => {
      controlCenter.updateTaskStatus(taskId, TASK_STATUS.FAILED, { error: err.message });
      controlCenter.createEscalation({
        sourceType: "ai_task",
        sourceId: taskId,
        title: "Orchestrator error",
        message: err.message,
        riskLevel: RISK_LEVEL.CRITICAL,
      });
    });
  });
}

function resumeAfterApproval(taskId) {
  enqueueTaskProcessing(taskId);
}

module.exports = {
  processTask,
  enqueueTaskProcessing,
  resumeAfterApproval,
  selectEmployeeForTask,
};
