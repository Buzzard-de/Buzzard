/**
 * Central exception management — stable codes, retry policy, dead-letter, audit.
 * Payments / purchases / refunds are never retried blindly.
 */

const { db } = require("../db");
const controlCenter = require("../controlCenter");
const {
  EXCEPTION_CODES,
  EXCEPTION_STATUS,
  SENSITIVE_ACTIONS,
  RETRY_BACKOFF_MS,
  DEFAULT_MAX_RETRIES,
} = require("./constants");
const { newId } = require("./hash");
const { publicTaskError, classifySystemFailure } = require("../security");

const NON_RETRYABLE = new Set([
  EXCEPTION_CODES.PERMISSION_DENIED,
  EXCEPTION_CODES.GUARDIAN_BLOCKED,
  EXCEPTION_CODES.VALIDATION_FAILED,
  EXCEPTION_CODES.MISSING_COST,
  EXCEPTION_CODES.STOCK_UNCONFIRMED,
  EXCEPTION_CODES.SALES_LOCKED,
  EXCEPTION_CODES.APPROVAL_INVALID,
  EXCEPTION_CODES.INPUT_CHANGED,
  EXCEPTION_CODES.AUTH_FAILED,
  EXCEPTION_CODES.RATE_LIMIT,
  EXCEPTION_CODES.SENSITIVE_NO_RETRY,
]);

const SENSITIVE_HINT = /\b(payment|refund|purchase|payout|supplier\.order|marketplace\.publish)\b/i;

function httpStatusExceptionCode(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  if (status === 401) return EXCEPTION_CODES.AUTH_FAILED;
  if (status === 403) return EXCEPTION_CODES.PERMISSION_DENIED;
  if (status === 408 || status === 504) return EXCEPTION_CODES.TASK_TIMEOUT;
  if (status === 429) return EXCEPTION_CODES.RATE_LIMIT;
  if (status === 502 || status === 503) return EXCEPTION_CODES.PROVIDER_UNAVAILABLE;
  return null;
}

function structuredExceptionCode(error) {
  if (!error) return null;
  if (error.pusatCode && Object.values(EXCEPTION_CODES).includes(error.pusatCode)) return error.pusatCode;
  if (error.code && Object.values(EXCEPTION_CODES).includes(error.code)) return error.code;
  if (error.errorKey && Object.values(EXCEPTION_CODES).includes(error.errorKey)) return error.errorKey;
  const sys = classifySystemFailure(error);
  if (sys === "TIMEOUT") return EXCEPTION_CODES.TASK_TIMEOUT;
  if (sys === "NETWORK") return EXCEPTION_CODES.PROVIDER_UNAVAILABLE;
  if (sys === "CONFLICT") return EXCEPTION_CODES.VALIDATION_FAILED;
  if (sys === "DATABASE") return EXCEPTION_CODES.DATABASE_FAILURE;
  return httpStatusExceptionCode(error);
}

function classify(error, { action } = {}) {
  const actionKey = action || null;
  const code =
    structuredExceptionCode(error) ||
    (SENSITIVE_ACTIONS.includes(actionKey) ? EXCEPTION_CODES.SENSITIVE_NO_RETRY : EXCEPTION_CODES.UNKNOWN);
  const sensitive = SENSITIVE_ACTIONS.includes(actionKey) || SENSITIVE_HINT.test(String(actionKey || ""));
  const retryable = !sensitive && !NON_RETRYABLE.has(code);
  return {
    code,
    retryable,
    sensitive,
    message: code,
    action: actionKey,
  };
}

function redactError(text) {
  return String(text || "")
    .replace(/(api[_-]?key|secret|token|password|authorization|bearer)\s*[=:]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, 400);
}

function recordException({
  code,
  taskId,
  correlationId,
  retryable,
  details,
  lastError,
  maxRetries = DEFAULT_MAX_RETRIES,
}) {
  const id = newId("exc");
  db.prepare(
    `INSERT INTO core_ai_exceptions(
      id, code, task_id, correlation_id, retryable, retry_count, max_retries, status, details_json, last_error
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  ).run(
    id,
    code || EXCEPTION_CODES.UNKNOWN,
    taskId || null,
    correlationId || null,
    retryable ? 1 : 0,
    maxRetries,
    retryable ? EXCEPTION_STATUS.OPEN : EXCEPTION_STATUS.ESCALATED,
    JSON.stringify(details || {}),
    publicTaskError(lastError, code || EXCEPTION_CODES.UNKNOWN)
  );

  if (!retryable) {
    controlCenter.createEscalation({
      sourceType: "ai_exception",
      sourceId: id,
      title: `AI exception ${code}`,
      message: publicTaskError(lastError, code || EXCEPTION_CODES.UNKNOWN),
      riskLevel: "HIGH",
      metadata: { taskId, correlationId },
    });
  }

  controlCenter.recordSystemEvent({
    eventType: "ai.exception.recorded",
    resourceType: "ai_exception",
    resourceId: id,
    summary: code,
    metadata: { taskId, retryable },
  });

  return getException(id);
}

function getException(id) {
  const row = db.prepare("SELECT * FROM core_ai_exceptions WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    taskId: row.task_id,
    correlationId: row.correlation_id,
    retryable: Boolean(row.retryable),
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    status: row.status,
    details: row.details_json ? JSON.parse(row.details_json) : {},
    lastError: publicTaskError(row.last_error, row.code || EXCEPTION_CODES.UNKNOWN),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recoveredAt: row.recovered_at,
  };
}

function listExceptions({ status, taskId, limit = 100 } = {}) {
  let sql = "SELECT id FROM core_ai_exceptions WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (taskId) {
    sql += " AND task_id = ?";
    params.push(taskId);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  return db.prepare(sql).all(...params).map((r) => getException(r.id));
}

function backoffMs(retryCount) {
  return RETRY_BACKOFF_MS[Math.min(retryCount, RETRY_BACKOFF_MS.length - 1)];
}

function shouldRetry(exception) {
  if (!exception) return { retry: false, reason: "missing" };
  if (!exception.retryable) return { retry: false, reason: "non_retryable" };
  if (exception.retryCount >= exception.maxRetries) return { retry: false, reason: "limit_reached" };
  if (exception.status === EXCEPTION_STATUS.DEAD_LETTER) return { retry: false, reason: "dead_letter" };
  return { retry: true, delayMs: backoffMs(exception.retryCount) };
}

function markRetry(id) {
  db.prepare(
    `UPDATE core_ai_exceptions
     SET retry_count = retry_count + 1, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(EXCEPTION_STATUS.RETRYING, id);
  return getException(id);
}

function markRecovered(id) {
  db.prepare(
    `UPDATE core_ai_exceptions
     SET status = ?, recovered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(EXCEPTION_STATUS.RECOVERED, id);
  return getException(id);
}

function deadLetter(id, reason) {
  db.prepare(
    `UPDATE core_ai_exceptions
     SET status = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    EXCEPTION_STATUS.DEAD_LETTER,
    publicTaskError(reason, "dead_letter"),
    id
  );
  const row = getException(id);
  controlCenter.createEscalation({
    sourceType: "ai_exception",
    sourceId: id,
    title: "AI task dead-lettered",
    message: publicTaskError(reason, row?.code || "dead_letter"),
    riskLevel: "CRITICAL",
  });
  return row;
}

function summarize() {
  try {
    const rows = db
      .prepare(
        `SELECT status, COUNT(*) AS n FROM core_ai_exceptions GROUP BY status`
      )
      .all();
    const byStatus = {};
    let total = 0;
    for (const row of rows) {
      byStatus[row.status] = Number(row.n) || 0;
      total += Number(row.n) || 0;
    }
    return {
      ok: true,
      total,
      byStatus,
      liveRecovery: false,
      sensitiveRetry: false,
      productionVerified: false,
    };
  } catch {
    return {
      ok: false,
      total: 0,
      byStatus: {},
      liveRecovery: false,
      sensitiveRetry: false,
      productionVerified: false,
      reason: "EXCEPTION_STORE_UNAVAILABLE",
    };
  }
}

function handleFailure(error, context = {}) {
  const classified = classify(error, context);
  const recorded = recordException({
    code: classified.code,
    taskId: context.taskId,
    correlationId: context.correlationId,
    retryable: classified.retryable,
    details: { action: classified.action, sensitive: classified.sensitive },
    lastError: classified.code,
    maxRetries: context.maxRetries,
  });
  const retry = shouldRetry(recorded);
  if (!retry.retry) {
    if (recorded.retryable && recorded.retryCount >= recorded.maxRetries) {
      deadLetter(recorded.id, "retry_limit");
    }
  }
  return { classified, exception: getException(recorded.id), retry };
}

module.exports = {
  classify,
  recordException,
  getException,
  listExceptions,
  shouldRetry,
  backoffMs,
  markRetry,
  markRecovered,
  deadLetter,
  handleFailure,
  summarize,
};
