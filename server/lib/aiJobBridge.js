/**
 * Part 5 — AI Orchestrator → Job Queue bridge (no admin permission inheritance).
 */
const controlCenter = require("./controlCenter");
const { aiCanExecute } = require("./rbac");
const { TASK_STATUS } = require("../core/constants");
const { FAILURE_KIND } = require("../core/jobConstants");

const BLOCKED_AI_PERMISSIONS = new Set([
  "*",
  "system.configure",
  "security.manage",
  "users.write",
  "orders.write",
]);

function validateAiPermissions(required = []) {
  for (const perm of required) {
    if (BLOCKED_AI_PERMISSIONS.has(perm)) {
      return { ok: false, error: `Blocked permission: ${perm}` };
    }
  }
  return { ok: true };
}

async function runAiJobSafely(job) {
  const taskId = job.payload?.taskId;
  if (!taskId) {
    return {
      ok: true,
      note: "AI job foundation — no taskId in payload",
      simulated: true,
    };
  }

  const task = controlCenter.listAiTasks({ limit: 1000 }).find((t) => t.id === taskId);
  if (!task) {
    const err = new Error(`AI task not found: ${taskId}`);
    err.failureKind = FAILURE_KIND.VALIDATION;
    throw err;
  }

  const required = task.permissionsRequired || [];
  const permCheck = validateAiPermissions(required);
  if (!permCheck.ok) {
    const err = new Error(permCheck.error);
    err.failureKind = FAILURE_KIND.VALIDATION;
    throw err;
  }

  if (task.status === TASK_STATUS.WAITING_APPROVAL) {
    const err = new Error("AI task waiting approval — cannot bypass");
    err.failureKind = FAILURE_KIND.VALIDATION;
    throw err;
  }

  const employee = task.employeeId
    ? controlCenter.getAiEmployee(task.employeeId)
    : null;
  if (employee) {
    for (const perm of required) {
      if (!aiCanExecute(employee.permissions, perm)) {
        const err = new Error(`AI employee lacks permission: ${perm}`);
        err.failureKind = FAILURE_KIND.VALIDATION;
        throw err;
      }
    }
  }

  return {
    ok: true,
    taskId,
    status: task.status,
    note: "AI worker executed permission/approval checks — provider call deferred in Part 5",
    adminPermissionsInherited: false,
  };
}

function enqueueAiTaskAsJob(taskId, { priority, createdBy } = {}) {
  const jobQueue = require("./jobQueue");
  return jobQueue.enqueueJob({
    jobType: "AI_TASK",
    payload: { taskId },
    priority,
    createdBy,
  });
}

module.exports = {
  runAiJobSafely,
  enqueueAiTaskAsJob,
  validateAiPermissions,
  BLOCKED_AI_PERMISSIONS,
};
