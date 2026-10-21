/**
 * Central Pusat submit pathway — unique ids, idempotency, correlation, classification.
 */

const controlCenter = require("../controlCenter");
const { db } = require("../db");
const { hashInput, newCorrelationId } = require("./hash");
const { DEFAULT_TASK_TIMEOUT_MS, TASK_PRIORITY } = require("./constants");
const agents = require("./agents");

function getMeta(taskId) {
  const row = db.prepare("SELECT * FROM core_ai_task_meta WHERE task_id = ?").get(taskId);
  return row || null;
}

function findByIdempotency(key) {
  if (!key) return null;
  return db.prepare("SELECT * FROM core_ai_task_meta WHERE idempotency_key = ?").get(key);
}

function upsertMeta(taskId, fields) {
  const existing = getMeta(taskId);
  if (!existing) {
    db.prepare(
      `INSERT INTO core_ai_task_meta(
        task_id, correlation_id, idempotency_key, input_hash, timeout_at, classified_as, agent_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      taskId,
      fields.correlationId || null,
      fields.idempotencyKey || null,
      fields.inputHash || null,
      fields.timeoutAt || null,
      fields.classifiedAs || null,
      fields.agentCode || null
    );
    return getMeta(taskId);
  }
  db.prepare(
    `UPDATE core_ai_task_meta
     SET correlation_id = COALESCE(?, correlation_id),
         input_hash = COALESCE(?, input_hash),
         timeout_at = COALESCE(?, timeout_at),
         classified_as = COALESCE(?, classified_as),
         agent_code = COALESCE(?, agent_code),
         updated_at = CURRENT_TIMESTAMP
     WHERE task_id = ?`
  ).run(
    fields.correlationId || null,
    fields.inputHash || null,
    fields.timeoutAt || null,
    fields.classifiedAs || null,
    fields.agentCode || null,
    taskId
  );
  return getMeta(taskId);
}

function submitTask({
  title,
  description,
  employeeId,
  agentCode,
  priority,
  permissionsRequired,
  payload,
  createdBy,
  dependsOnTaskId,
  idempotencyKey,
  correlationId,
  timeoutMs,
  enqueue = true,
} = {}) {
  if (!title || typeof title !== "string") {
    const err = new Error("title is required");
    err.code = "PUSAT_VALIDATION_FAILED";
    throw err;
  }

  agents.ensureSpecialistEmployees();

  if (idempotencyKey) {
    const existingMeta = findByIdempotency(idempotencyKey);
    if (existingMeta) {
      const task = controlCenter.listAiTasks({ limit: 1000 }).find((t) => t.id === existingMeta.task_id);
      return {
        duplicate: true,
        idempotent: true,
        task,
        meta: existingMeta,
      };
    }
  }

  const classified = agents.classifyAgent(title, { ...payload, agentCode, kind: agentCode });
  const agent = agents.getAgent(classified);
  const resolvedEmployee = employeeId || agent?.employeeId || null;
  const perms = permissionsRequired || agent?.permissions || ["ai.execute"];
  const body = { ...(payload || {}), agentCode: classified };
  const inputHash = hashInput(body);
  const corr = correlationId || newCorrelationId();
  const timeoutAt = new Date(Date.now() + (timeoutMs || DEFAULT_TASK_TIMEOUT_MS)).toISOString();

  let task;
  try {
    task = controlCenter.createAiTask({
      title,
      description,
      employeeId: resolvedEmployee,
      priority: priority || TASK_PRIORITY.NORMAL,
      permissionsRequired: perms,
      payload: body,
      createdBy,
      dependsOnTaskId,
    });
  } catch (error) {
    error.code = error.code || "PUSAT_VALIDATION_FAILED";
    throw error;
  }

  try {
    db.prepare(
      `UPDATE core_ai_tasks SET correlation_id = ?, idempotency_key = ?, timeout_at = ?, input_hash = ?
       WHERE id = ?`
    ).run(corr, idempotencyKey || null, timeoutAt, inputHash, task.id);
  } catch {
    /* columns may be missing on older snapshots — meta table is the source for Pusat */
  }

  const meta = upsertMeta(task.id, {
    correlationId: corr,
    idempotencyKey: idempotencyKey || null,
    inputHash,
    timeoutAt,
    classifiedAs: classified,
    agentCode: classified,
  });

  controlCenter.recordSystemEvent({
    eventType: "pusat.task.submitted",
    actorType: "pusat",
    actorId: createdBy || "system",
    resourceType: "ai_task",
    resourceId: task.id,
    summary: `Pusat accepted ${title}`,
    metadata: { correlationId: corr, agentCode: classified },
  });

  if (enqueue) {
    const { enqueueTaskProcessing } = require("../aiOrchestrator");
    enqueueTaskProcessing(task.id);
  }

  return {
    duplicate: false,
    task: { ...task, correlationId: corr, agentCode: classified, inputHash, timeoutAt },
    meta,
  };
}

module.exports = {
  submitTask,
  getMeta,
  upsertMeta,
  findByIdempotency,
};
