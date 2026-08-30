/**
 * Part 17 — Job idempotency — prevents duplicate critical operations on retry.
 */
const crypto = require("crypto");
const { db } = require("../db");
const { OPERATIONS_STATUS } = require("../../core/operationsConstants");

function hashKey(operation, scope, key) {
  const raw = `${operation}:${scope}:${key}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function beginOperation({ operation, scope, idempotencyKey, jobId, metadata } = {}) {
  if (!operation || !idempotencyKey) {
    return { ok: false, code: "idempotency_key_required" };
  }

  const key = hashKey(operation, scope || "global", idempotencyKey);
  const existing = db.prepare("SELECT * FROM core_job_idempotency WHERE idempotency_key = ?").get(key);

  if (existing) {
    if (existing.status === OPERATIONS_STATUS.SUCCESS) {
      return {
        ok: false,
        duplicate: true,
        code: "already_completed",
        existingJobId: existing.job_id,
        result: existing.result_json ? JSON.parse(existing.result_json) : null,
      };
    }
    if (existing.status === OPERATIONS_STATUS.RUNNING) {
      return {
        ok: false,
        duplicate: true,
        code: "already_running",
        existingJobId: existing.job_id,
      };
    }
  }

  const id = `idem_${crypto.randomBytes(6).toString("hex")}`;
  try {
    db.prepare(`
      INSERT INTO core_job_idempotency(
        id, idempotency_key, operation, scope, job_id, status, attempts, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    `).run(
      id,
      key,
      operation,
      scope || "global",
      jobId || null,
      OPERATIONS_STATUS.RUNNING,
      metadata ? JSON.stringify(metadata) : null
    );
    return { ok: true, id, idempotencyKey: key, status: OPERATIONS_STATUS.RUNNING };
  } catch {
    const again = db.prepare("SELECT * FROM core_job_idempotency WHERE idempotency_key = ?").get(key);
    return {
      ok: false,
      duplicate: true,
      code: "concurrent_conflict",
      existingJobId: again?.job_id,
    };
  }
}

function completeOperation(idempotencyKeyHash, { result, status = OPERATIONS_STATUS.SUCCESS, error } = {}) {
  db.prepare(`
    UPDATE core_job_idempotency
    SET status = ?, result_json = ?, error_message = ?, finished_at = CURRENT_TIMESTAMP, attempts = attempts + 1
    WHERE idempotency_key = ?
  `).run(
    status,
    result ? JSON.stringify(result) : null,
    error || null,
    idempotencyKeyHash
  );
}

function failOperation(idempotencyKeyHash, error, { permanent = false } = {}) {
  completeOperation(idempotencyKeyHash, {
    status: permanent ? OPERATIONS_STATUS.PERMANENTLY_FAILED : OPERATIONS_STATUS.FAILED,
    error,
  });
}

function getOperation(idempotencyKey, operation, scope) {
  const key = hashKey(operation, scope || "global", idempotencyKey);
  const row = db.prepare("SELECT * FROM core_job_idempotency WHERE idempotency_key = ?").get(key);
  if (!row) return null;
  return {
    id: row.id,
    operation: row.operation,
    scope: row.scope,
    jobId: row.job_id,
    status: row.status,
    attempts: row.attempts,
    result: row.result_json ? JSON.parse(row.result_json) : null,
    error: row.error_message,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

module.exports = {
  hashKey,
  beginOperation,
  completeOperation,
  failOperation,
  getOperation,
};
