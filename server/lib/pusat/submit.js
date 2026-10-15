/**
 * Central Pusat submit pathway — unique ids, idempotency, correlation, classification.
 */

const controlCenter = require("../controlCenter");
const { db } = require("../db");
const { hashInput, newCorrelationId } = require("./hash");
const { DEFAULT_TASK_TIMEOUT_MS, TASK_PRIORITY } = require("./constants");
const { TASK_STATUS } = require("../../core/constants");
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

function replayExisting(idempotencyKey, inputHash) {
  const existingMeta = findByIdempotency(idempotencyKey);
  if (!existingMeta) return null;
  if (existingMeta.input_hash && existingMeta.input_hash !== inputHash) {
    const err = new Error("The idempotency key was already used with a different payload");
    err.code = "IDEMPOTENCY_CONFLICT";
    err.statusCode = 409;
    throw err;
  }
  const task = controlCenter.getAiTask(existingMeta.task_id);
  const inProgress = Boolean(task && task.status === TASK_STATUS.RUNNING);
  return {
    duplicate: true,
    idempotent: true,
    replayed: !inProgress,
    inProgress,
    conflict: false,
    enqueued: false,
    task,
    meta: existingMeta,
  };
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

  const classified = agents.classifyAgent(title, { ...payload, agentCode, kind: agentCode });
  const agent = agents.getAgent(classified);
  const resolvedEmployee = employeeId || agent?.employeeId || null;
  const perms = permissionsRequired || agent?.permissions || ["ai.execute"];
  const body = { ...(payload || {}), agentCode: classified };
  const inputHash = hashInput(body);
  const corr = correlationId || newCorrelationId();
  const timeoutAt = new Date(Date.now() + (timeoutMs || DEFAULT_TASK_TIMEOUT_MS)).toISOString();

  if (idempotencyKey) {
    const replay = replayExisting(idempotencyKey, inputHash);
    if (replay) return replay;
  }

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

  let meta;
  try {
    meta = upsertMeta(task.id, {
      correlationId: corr,
      idempotencyKey: idempotencyKey || null,
      inputHash,
      timeoutAt,
      classifiedAs: classified,
      agentCode: classified,
    });
  } catch (error) {
    const { isUniqueConstraint, publicTaskError } = require("../security");
    if (idempotencyKey && isUniqueConstraint(error)) {
      try {
        controlCenter.updateTaskStatus(task.id, TASK_STATUS.CANCELLED, {
          error: "idempotency_race",
          result: { orphan: true, sideEffects: false, enqueued: false },
        });
      } catch {
        /* best-effort cancel of the losing race task */
      }
      const replay = replayExisting(idempotencyKey, inputHash);
      if (replay) return replay;
    }
    const classified = new Error(isUniqueConstraint(error) ? "PUSAT_VALIDATION_FAILED" : "PUSAT_DATABASE_FAILURE");
    classified.code = isUniqueConstraint(error) ? "PUSAT_VALIDATION_FAILED" : "PUSAT_DATABASE_FAILURE";
    classified.errorKey = publicTaskError(error, classified.code);
    classified.statusCode = isUniqueConstraint(error) ? 409 : 500;
    throw classified;
  }

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
    replayed: false,
    inProgress: false,
    conflict: false,
    task: { ...task, correlationId: corr, agentCode: classified, inputHash, timeoutAt },
    meta,
  };
}

module.exports = {
  submitTask,
  getMeta,
  upsertMeta,
  findByIdempotency,
  replayExisting,
};
