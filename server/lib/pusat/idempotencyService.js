"use strict";
/**
 * BUZZARD / PUSAT
 * Production-Grade Idempotency Service
 *
 * Amaç:
 * - Aynı operation + idempotencyKey tekrar geldiğinde işlemi ikinci kez çalıştırmamak
 * - Aynı key ile farklı payload gönderilmesini engellemek
 * - Process restart sonrası dedupe bilgisini kaybetmemek
 * - Concurrent duplicate requests sırasında yalnızca bir execution yapmak
 * - core_ai_tasks mevcut schema'sını değiştirmeden payload_json üzerinden çalışmak
 *
 * Kullanım:
 *
 * const {
 *   createIdempotencyService,
 * } = require('./idempotencyService');
 *
 * const idempotency = createIdempotencyService(db);
 *
 * const result = await idempotency.execute({
 *   operation: 'PUSAT_DISPATCH',
 *   idempotencyKey: req.body.idempotencyKey,
 *   payload: req.body,
 *   correlationId: req.correlationId,
 *   actorId: req.user?.id ?? null,
 *   execute: async () => {
 *     return await actualOperation();
 *   },
 * });
 */
const crypto = require("crypto");
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 256;
const MAX_OPERATION_LENGTH = 128;
const MAX_PAYLOAD_BYTES = 512 * 1024;
const STATUS = Object.freeze({
  IN_PROGRESS: "IN_PROGRESS",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
});
function assertDb(db) {
  if (!db) {
    throw new Error("IdempotencyService requires a database instance");
  }
  if (typeof db.prepare !== "function" && typeof db.exec !== "function") {
    throw new Error("IdempotencyService requires a SQLite-compatible database");
  }
}
function nowIso() {
  return new Date().toISOString();
}
function normalizeString(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${field} exceeds maximum length`);
  }
  return normalized;
}
function stableSort(value) {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stableSort(value[key]);
        return result;
      }, {});
  }
  return value;
}
function stableJson(value) {
  return JSON.stringify(stableSort(value));
}
function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function payloadHash(payload) {
  const json = stableJson(payload ?? null);
  const bytes = Buffer.byteLength(json, "utf8");
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new Error(`Idempotency payload exceeds ${MAX_PAYLOAD_BYTES} bytes`);
  }
  return sha256(json);
}
function generateId() {
  return crypto.randomUUID();
}
function parseJson(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function safeJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return JSON.stringify({
      serializationError: true,
    });
  }
}
function createSchema(db) {
  /*
   * Bu tablo core_ai_tasks'i değiştirmez.
   *
   * Neden ayrı tablo?
   * - Mevcut production schema'yı kırmaz.
   * - UNIQUE(operation, idempotency_key) atomic dedupe sağlar.
   * - Process restart sonrası bilgi kaybolmaz.
   * - Commerce idempotency'den ayrıdır.
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS pusat_idempotency (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      result_json TEXT,
      error_json TEXT,
      correlation_id TEXT,
      actor_id TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      expires_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 1,
      UNIQUE(operation, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_pusat_idempotency_status
      ON pusat_idempotency(status);
    CREATE INDEX IF NOT EXISTS idx_pusat_idempotency_expires
      ON pusat_idempotency(expires_at);
    CREATE INDEX IF NOT EXISTS idx_pusat_idempotency_correlation
      ON pusat_idempotency(correlation_id);
  `);
}
function createStatements(db) {
  return {
    get: db.prepare(`
      SELECT *
      FROM pusat_idempotency
      WHERE operation = ?
        AND idempotency_key = ?
      LIMIT 1
    `),
    insert: db.prepare(`
      INSERT INTO pusat_idempotency (
        id,
        operation,
        idempotency_key,
        request_hash,
        status,
        result_json,
        error_json,
        correlation_id,
        actor_id,
        created_at,
        started_at,
        completed_at,
        expires_at,
        attempt_count
      )
      VALUES (
        ?, ?, ?, ?,
        ?,
        NULL,
        NULL,
        ?, ?,
        ?, ?, NULL, ?,
        1
      )
    `),
    markSucceeded: db.prepare(`
      UPDATE pusat_idempotency
      SET
        status = ?,
        result_json = ?,
        error_json = NULL,
        completed_at = ?
      WHERE id = ?
    `),
    markFailed: db.prepare(`
      UPDATE pusat_idempotency
      SET
        status = ?,
        result_json = NULL,
        error_json = ?,
        completed_at = ?,
        attempt_count = attempt_count + 1
      WHERE id = ?
    `),
    markRetry: db.prepare(`
      UPDATE pusat_idempotency
      SET
        status = ?,
        started_at = ?,
        completed_at = NULL,
        error_json = NULL,
        result_json = NULL,
        attempt_count = attempt_count + 1
      WHERE id = ?
    `),
    deleteExpired: db.prepare(`
      DELETE FROM pusat_idempotency
      WHERE expires_at <= ?
    `),
    deleteById: db.prepare(`
      DELETE FROM pusat_idempotency
      WHERE id = ?
    `),
  };
}
function isExpired(record, now = Date.now()) {
  if (!record?.expires_at) {
    return true;
  }
  const timestamp = Date.parse(record.expires_at);
  if (Number.isNaN(timestamp)) {
    return true;
  }
  return timestamp <= now;
}
function deserializeResult(record) {
  return parseJson(record.result_json, null);
}
function deserializeError(record) {
  return parseJson(record.error_json, null);
}
function duplicateResult(record) {
  return {
    deduplicated: true,
    replayed: true,
    status: record.status,
    idempotencyKey: record.idempotency_key,
    operation: record.operation,
    result: deserializeResult(record),
    error: deserializeError(record),
    correlationId: record.correlation_id ?? null,
    createdAt: record.created_at,
    completedAt: record.completed_at,
  };
}
function conflictError(message, metadata = {}) {
  const error = new Error(message);
  error.code = "IDEMPOTENCY_CONFLICT";
  error.statusCode = 409;
  error.metadata = metadata;
  return error;
}
function inProgressError(record) {
  const error = new Error("An operation with the same idempotency key is already in progress");
  error.code = "IDEMPOTENCY_IN_PROGRESS";
  error.statusCode = 409;
  error.metadata = {
    operation: record.operation,
    idempotencyKey: record.idempotency_key,
    correlationId: record.correlation_id ?? null,
    startedAt: record.started_at ?? null,
  };
  return error;
}
function createIdempotencyService(
  db,
  {
    ttlMs = DEFAULT_TTL_MS,
    retryFailed = true,
  } = {}
) {
  assertDb(db);
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error("ttlMs must be a positive integer");
  }
  createSchema(db);
  const statements = createStatements(db);
  /*
   * Transaction:
   * - first request creates the reservation
   * - duplicate request sees the existing row
   *
   * SQLite UNIQUE constraint is the final concurrency authority.
   */
  const reserve = db.transaction((input) => {
    const existing = statements.get.get(input.operation, input.idempotencyKey);
    if (existing && !isExpired(existing)) {
      return {
        created: false,
        record: existing,
      };
    }
    if (existing && isExpired(existing)) {
      statements.deleteById.run(existing.id);
    }
    const createdAt = nowIso();
    const startedAt = createdAt;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const id = generateId();
    try {
      statements.insert.run(
        id,
        input.operation,
        input.idempotencyKey,
        input.requestHash,
        STATUS.IN_PROGRESS,
        input.correlationId ?? null,
        input.actorId ?? null,
        createdAt,
        startedAt,
        expiresAt
      );
      return {
        created: true,
        record: statements.get.get(input.operation, input.idempotencyKey),
      };
    } catch (error) {
      /*
       * Another concurrent transaction may have won the
       * UNIQUE(operation, idempotency_key) race.
       *
       * Re-read instead of assuming failure.
       */
      const winner = statements.get.get(input.operation, input.idempotencyKey);
      if (winner) {
        return {
          created: false,
          record: winner,
        };
      }
      throw error;
    }
  });
  async function execute({
    operation,
    idempotencyKey,
    payload,
    correlationId = null,
    actorId = null,
    execute: handler,
  }) {
    operation = normalizeString(operation, "operation", MAX_OPERATION_LENGTH);
    idempotencyKey = normalizeString(idempotencyKey, "idempotencyKey", MAX_KEY_LENGTH);
    if (typeof handler !== "function") {
      throw new Error("Idempotency execute() requires an execute function");
    }
    const requestHash = payloadHash(payload);
    const reservation = reserve({
      operation,
      idempotencyKey,
      requestHash,
      correlationId,
      actorId,
    });
    let record = reservation.record;
    let claimedExecution = reservation.created;
    /*
     * Existing key:
     * payload MUST match exactly.
     */
    if (!reservation.created) {
      if (record.request_hash !== requestHash) {
        throw conflictError("The idempotency key was already used with a different payload", {
          operation,
          idempotencyKey,
        });
      }
      /*
       * Completed successful operation:
       * return the original result.
       */
      if (record.status === STATUS.SUCCEEDED) {
        return duplicateResult(record);
      }
      /*
       * Existing failed operation:
       *
       * If retryFailed=true, we intentionally allow another
       * execution attempt while keeping the same idempotency
       * identity.
       *
       * Otherwise return the original failure.
       */
      if (record.status === STATUS.FAILED) {
        if (!retryFailed) {
          return duplicateResult(record);
        }
        const startedAt = nowIso();
        statements.markRetry.run(STATUS.IN_PROGRESS, startedAt, record.id);
        record = statements.get.get(operation, idempotencyKey);
        claimedExecution = true;
      }
      /*
       * Existing in-progress operation:
       * NEVER execute the business operation a second time.
       */
      if (!claimedExecution && record.status === STATUS.IN_PROGRESS) {
        throw inProgressError(record);
      }
    }
    /*
     * Only the request that successfully reserved the key
     * (or claimed a failed-row retry) reaches this point.
     *
     * Therefore:
     *
     * execute() #1 -> business operation
     * execute() #2 -> replay / conflict / in-progress
     */
    let result;
    try {
      result = await handler({
        operation,
        idempotencyKey,
        correlationId,
        actorId,
        requestHash,
      });
      const completedAt = nowIso();
      statements.markSucceeded.run(STATUS.SUCCEEDED, safeJson(result), completedAt, record.id);
      return {
        deduplicated: false,
        replayed: false,
        status: STATUS.SUCCEEDED,
        idempotencyKey,
        operation,
        result,
        correlationId,
        createdAt: record.created_at,
        completedAt,
      };
    } catch (error) {
      const completedAt = nowIso();
      const errorPayload = {
        name: error?.name ?? "Error",
        code: error?.code ?? "UNKNOWN_ERROR",
        message: error?.message ?? String(error),
      };
      statements.markFailed.run(STATUS.FAILED, safeJson(errorPayload), completedAt, record.id);
      throw error;
    }
  }
  function cleanupExpired() {
    const result = statements.deleteExpired.run(nowIso());
    return {
      deleted: result.changes ?? 0,
    };
  }
  function get({ operation, idempotencyKey }) {
    operation = normalizeString(operation, "operation", MAX_OPERATION_LENGTH);
    idempotencyKey = normalizeString(idempotencyKey, "idempotencyKey", MAX_KEY_LENGTH);
    const record = statements.get.get(operation, idempotencyKey);
    if (!record) {
      return null;
    }
    return {
      id: record.id,
      operation: record.operation,
      idempotencyKey: record.idempotency_key,
      requestHash: record.request_hash,
      status: record.status,
      result: deserializeResult(record),
      error: deserializeError(record),
      correlationId: record.correlation_id,
      actorId: record.actor_id,
      createdAt: record.created_at,
      startedAt: record.started_at,
      completedAt: record.completed_at,
      expiresAt: record.expires_at,
      attemptCount: record.attempt_count,
      expired: isExpired(record),
    };
  }
  return Object.freeze({
    execute,
    get,
    cleanupExpired,
  });
}
module.exports = {
  createIdempotencyService,
  STATUS,
  DEFAULT_TTL_MS,
};
