/**
 * Part 5 — Integration health tracking.
 */
const { db } = require("./db");
const redisClient = require("./redisClient");
const { INTEGRATION_HEALTH } = require("../core/jobConstants");

function upsertHealth(integrationCode, patch) {
  db.prepare(`
    INSERT INTO core_integration_health(
      integration_code, status, response_time_ms, last_success_at, last_failure_at,
      error_count, last_error, metadata_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(integration_code) DO UPDATE SET
      status = excluded.status,
      response_time_ms = excluded.response_time_ms,
      last_success_at = COALESCE(excluded.last_success_at, core_integration_health.last_success_at),
      last_failure_at = COALESCE(excluded.last_failure_at, core_integration_health.last_failure_at),
      error_count = excluded.error_count,
      last_error = excluded.last_error,
      metadata_json = excluded.metadata_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    integrationCode,
    patch.status,
    patch.responseTimeMs ?? null,
    patch.lastSuccessAt ?? null,
    patch.lastFailureAt ?? null,
    patch.errorCount ?? 0,
    patch.lastError ?? null,
    JSON.stringify(patch.metadata || {})
  );
}

function getHealth(integrationCode) {
  const row = db.prepare("SELECT * FROM core_integration_health WHERE integration_code = ?").get(integrationCode);
  if (!row) return null;
  return {
    integrationCode: row.integration_code,
    status: row.status,
    responseTimeMs: row.response_time_ms,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    errorCount: row.error_count,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

function listAllHealth() {
  return db.prepare("SELECT * FROM core_integration_health ORDER BY integration_code").all().map((row) => ({
    integrationCode: row.integration_code,
    status: row.status,
    responseTimeMs: row.response_time_ms,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    errorCount: row.error_count,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  }));
}

async function checkRedis() {
  const health = await redisClient.healthCheck();
  const status = health.ok
    ? INTEGRATION_HEALTH.CONNECTED
    : health.configured
      ? INTEGRATION_HEALTH.ERROR
      : INTEGRATION_HEALTH.DISCONNECTED;
  upsertHealth("redis", {
    status,
    responseTimeMs: health.latencyMs,
    lastSuccessAt: health.ok ? new Date().toISOString() : null,
    lastFailureAt: health.ok ? null : new Date().toISOString(),
    lastError: health.error,
    errorCount: health.ok ? 0 : 1,
  });
  return getHealth("redis");
}

async function checkBuzzardApi() {
  upsertHealth("buzzard-api", {
    status: INTEGRATION_HEALTH.CONNECTED,
    responseTimeMs: 1,
    lastSuccessAt: new Date().toISOString(),
    errorCount: 0,
  });
  return getHealth("buzzard-api");
}

async function checkSuppliers() {
  try {
    const { getAdapter } = require("./supplier/adapterRegistry");
    const adapter = getAdapter("mock");
    const start = Date.now();
    const h = await adapter.healthCheck();
    const ms = Date.now() - start;
    upsertHealth("suppliers", {
      status: h.ok ? INTEGRATION_HEALTH.CONNECTED : INTEGRATION_HEALTH.DEGRADED,
      responseTimeMs: ms,
      lastSuccessAt: h.ok ? new Date().toISOString() : null,
      lastFailureAt: h.ok ? null : new Date().toISOString(),
      lastError: h.error || null,
      errorCount: h.ok ? 0 : 1,
    });
  } catch (err) {
    upsertHealth("suppliers", {
      status: INTEGRATION_HEALTH.ERROR,
      lastFailureAt: new Date().toISOString(),
      lastError: err.message,
      errorCount: 1,
    });
  }
  return getHealth("suppliers");
}

async function runAllHealthChecks() {
  await checkBuzzardApi();
  await checkRedis();
  await checkSuppliers();
  return listAllHealth();
}

module.exports = {
  upsertHealth,
  getHealth,
  listAllHealth,
  runAllHealthChecks,
  checkRedis,
};
