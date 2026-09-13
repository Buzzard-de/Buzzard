/**
 * Supplier Engine — persistent SQLite store adapter.
 * Registry overlay, runtime state, cursors, health, idempotency, audit.
 */
const { db } = require("../db");

const SECRET_KEYS = /secret|password|token|credential|authorization|api_key|apikey/i;

function parseJson(raw, fallback = {}) {
  try {
    return JSON.parse(raw || (Array.isArray(fallback) ? "[]" : "{}"));
  } catch {
    return fallback;
  }
}

function redactMetadata(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactMetadata);
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SECRET_KEYS.test(key)) out[key] = "[REDACTED]";
    else if (typeof value === "object") out[key] = redactMetadata(value);
    else out[key] = value;
  }
  return out;
}

function maskCursorValue(value) {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}${"*".repeat(Math.min(8, value.length - 2))}`;
}

function rowToRegistry(row) {
  if (!row) return undefined;
  return {
    supplierId: row.supplier_id,
    name: row.name,
    displayName: row.display_name || row.name,
    country: row.country || "DE",
    connectorType: row.connector_type || "manual",
    supportedMarkets: parseJson(row.supported_markets_json, []),
    capabilities: parseJson(row.capabilities_json, {}),
    active: row.active === 1,
    status: row.status || "CONNECTED",
    secretsRef: row.secrets_ref || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRuntimeState(row) {
  if (!row) return undefined;
  return {
    supplierId: row.supplier_id,
    syncStatus: row.sync_status || "IDLE",
    healthStatus: row.health_status || "UNKNOWN",
    lastSyncStartedAt: row.last_sync_started_at || undefined,
    lastSyncCompletedAt: row.last_sync_completed_at || undefined,
    lastSyncSuccessAt: row.last_sync_success_at || undefined,
    lastSyncFailureAt: row.last_sync_failure_at || undefined,
    lastErrorCode: row.last_error_code || undefined,
    lastErrorMessageSafe: row.last_error_message_safe || undefined,
    lastSyncJobId: row.last_sync_job_id || undefined,
    syncLockJobId: row.sync_lock_job_id || undefined,
    syncLockAcquiredAt: row.sync_lock_acquired_at || undefined,
    productsProcessed: row.products_processed || 0,
    productsAccepted: row.products_accepted || 0,
    productsRejected: row.products_rejected || 0,
    offersUpdated: row.offers_updated || 0,
    stockUpdated: row.stock_updated || 0,
    priceUpdated: row.price_updated || 0,
    reliabilityScore: row.reliability_score ?? 0.5,
    updatedAt: row.updated_at,
  };
}

function rowToCursor(row) {
  if (!row) return undefined;
  return {
    supplierId: row.supplier_id,
    syncMode: row.sync_mode,
    cursor: row.cursor_value || undefined,
    page: row.page ?? undefined,
    offset: row.offset_value ?? undefined,
    lastModified: row.last_modified || undefined,
    updatedAt: row.updated_at,
  };
}

function rowToHealth(row) {
  if (!row) return undefined;
  return {
    supplierId: row.supplier_id,
    healthStatus: row.health_status || "UNKNOWN",
    responseTimeMs: row.response_time_ms || 0,
    errorCount: row.error_count || 0,
    successCount: row.success_count || 0,
    rateLimitCount: row.rate_limit_count || 0,
    consecutiveFailures: row.consecutive_failures || 0,
    lastSuccessfulOperation: row.last_successful_operation || undefined,
    lastFailedOperation: row.last_failed_operation || undefined,
    reliabilityScore: row.reliability_score ?? 0.5,
    updatedAt: row.updated_at,
  };
}

function createPersistentSupplierStore() {
  const upsertRegistry = db.prepare(`
    INSERT INTO supplier_engine_registry (
      supplier_id, name, display_name, country, connector_type,
      supported_markets_json, capabilities_json, active, status, secrets_ref, created_at, updated_at
    ) VALUES (
      @supplier_id, @name, @display_name, @country, @connector_type,
      @supported_markets_json, @capabilities_json, @active, @status, @secrets_ref, @created_at, @updated_at
    )
    ON CONFLICT(supplier_id) DO UPDATE SET
      name = excluded.name,
      display_name = excluded.display_name,
      country = excluded.country,
      connector_type = excluded.connector_type,
      supported_markets_json = excluded.supported_markets_json,
      capabilities_json = excluded.capabilities_json,
      active = excluded.active,
      status = excluded.status,
      secrets_ref = excluded.secrets_ref,
      updated_at = excluded.updated_at
  `);

  const upsertRuntime = db.prepare(`
    INSERT INTO supplier_engine_runtime_state (
      supplier_id, sync_status, health_status,
      last_sync_started_at, last_sync_completed_at, last_sync_success_at, last_sync_failure_at,
      last_error_code, last_error_message_safe, last_sync_job_id,
      sync_lock_job_id, sync_lock_acquired_at,
      products_processed, products_accepted, products_rejected,
      offers_updated, stock_updated, price_updated,
      reliability_score, updated_at
    ) VALUES (
      @supplier_id, @sync_status, @health_status,
      @last_sync_started_at, @last_sync_completed_at, @last_sync_success_at, @last_sync_failure_at,
      @last_error_code, @last_error_message_safe, @last_sync_job_id,
      @sync_lock_job_id, @sync_lock_acquired_at,
      @products_processed, @products_accepted, @products_rejected,
      @offers_updated, @stock_updated, @price_updated,
      @reliability_score, @updated_at
    )
    ON CONFLICT(supplier_id) DO UPDATE SET
      sync_status = excluded.sync_status,
      health_status = excluded.health_status,
      last_sync_started_at = COALESCE(excluded.last_sync_started_at, supplier_engine_runtime_state.last_sync_started_at),
      last_sync_completed_at = COALESCE(excluded.last_sync_completed_at, supplier_engine_runtime_state.last_sync_completed_at),
      last_sync_success_at = COALESCE(excluded.last_sync_success_at, supplier_engine_runtime_state.last_sync_success_at),
      last_sync_failure_at = COALESCE(excluded.last_sync_failure_at, supplier_engine_runtime_state.last_sync_failure_at),
      last_error_code = excluded.last_error_code,
      last_error_message_safe = excluded.last_error_message_safe,
      last_sync_job_id = COALESCE(excluded.last_sync_job_id, supplier_engine_runtime_state.last_sync_job_id),
      sync_lock_job_id = excluded.sync_lock_job_id,
      sync_lock_acquired_at = excluded.sync_lock_acquired_at,
      products_processed = COALESCE(excluded.products_processed, supplier_engine_runtime_state.products_processed),
      products_accepted = COALESCE(excluded.products_accepted, supplier_engine_runtime_state.products_accepted),
      products_rejected = COALESCE(excluded.products_rejected, supplier_engine_runtime_state.products_rejected),
      offers_updated = COALESCE(excluded.offers_updated, supplier_engine_runtime_state.offers_updated),
      stock_updated = COALESCE(excluded.stock_updated, supplier_engine_runtime_state.stock_updated),
      price_updated = COALESCE(excluded.price_updated, supplier_engine_runtime_state.price_updated),
      reliability_score = excluded.reliability_score,
      updated_at = excluded.updated_at
  `);

  const upsertCursor = db.prepare(`
    INSERT INTO supplier_engine_sync_cursors (
      supplier_id, sync_mode, cursor_value, page, offset_value, last_modified, updated_at
    ) VALUES (
      @supplier_id, @sync_mode, @cursor_value, @page, @offset_value, @last_modified, @updated_at
    )
    ON CONFLICT(supplier_id, sync_mode) DO UPDATE SET
      cursor_value = excluded.cursor_value,
      page = excluded.page,
      offset_value = excluded.offset_value,
      last_modified = excluded.last_modified,
      updated_at = excluded.updated_at
  `);

  const upsertHealth = db.prepare(`
    INSERT INTO supplier_engine_health (
      supplier_id, health_status, response_time_ms, error_count, success_count,
      rate_limit_count, consecutive_failures,
      last_successful_operation, last_failed_operation, reliability_score, updated_at
    ) VALUES (
      @supplier_id, @health_status, @response_time_ms, @error_count, @success_count,
      @rate_limit_count, @consecutive_failures,
      @last_successful_operation, @last_failed_operation, @reliability_score, @updated_at
    )
    ON CONFLICT(supplier_id) DO UPDATE SET
      health_status = excluded.health_status,
      response_time_ms = excluded.response_time_ms,
      error_count = excluded.error_count,
      success_count = excluded.success_count,
      rate_limit_count = excluded.rate_limit_count,
      consecutive_failures = excluded.consecutive_failures,
      last_successful_operation = COALESCE(excluded.last_successful_operation, supplier_engine_health.last_successful_operation),
      last_failed_operation = COALESCE(excluded.last_failed_operation, supplier_engine_health.last_failed_operation),
      reliability_score = excluded.reliability_score,
      updated_at = excluded.updated_at
  `);

  const insertIdempotency = db.prepare(`
    INSERT OR IGNORE INTO supplier_engine_sync_idempotency (idempotency_key, supplier_id, created_at)
    VALUES (@idempotency_key, @supplier_id, @created_at)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO supplier_engine_audit (actor, supplier_id, action, correlation_id, metadata_json, audit_timestamp)
    VALUES (@actor, @supplier_id, @action, @correlation_id, @metadata_json, @audit_timestamp)
  `);

  const upsertOrderSandbox = db.prepare(`
    INSERT INTO supplier_engine_order_sandbox (
      supplier_order_id, buzzard_order_id, supplier_id, status, idempotency_key,
      correlation_id, payload_json, tracking_json, failure_class, failure_code,
      failure_message, latency_ms, created_at, updated_at
    ) VALUES (
      @supplier_order_id, @buzzard_order_id, @supplier_id, @status, @idempotency_key,
      @correlation_id, @payload_json, @tracking_json, @failure_class, @failure_code,
      @failure_message, @latency_ms, @created_at, @updated_at
    )
    ON CONFLICT(idempotency_key) DO UPDATE SET
      status = excluded.status,
      tracking_json = COALESCE(excluded.tracking_json, supplier_engine_order_sandbox.tracking_json),
      failure_class = excluded.failure_class,
      failure_code = excluded.failure_code,
      failure_message = excluded.failure_message,
      latency_ms = excluded.latency_ms,
      updated_at = excluded.updated_at
  `);

  return {
    getMode: () => "sqlite",

    listRegistryRows() {
      return db.prepare("SELECT * FROM supplier_engine_registry ORDER BY name").all().map(rowToRegistry);
    },

    getRegistryRow(supplierId) {
      return rowToRegistry(
        db.prepare("SELECT * FROM supplier_engine_registry WHERE supplier_id = ?").get(supplierId)
      );
    },

    saveRegistryRow(row) {
      const now = new Date().toISOString();
      upsertRegistry.run({
        supplier_id: row.supplierId,
        name: row.name,
        display_name: row.displayName || row.name,
        country: row.country || "DE",
        connector_type: row.connectorType || "manual",
        supported_markets_json: JSON.stringify(row.supportedMarkets || []),
        capabilities_json: JSON.stringify(row.capabilities || {}),
        active: row.active === false ? 0 : 1,
        status: row.status || "CONNECTED",
        secrets_ref: row.secretsRef || null,
        created_at: row.createdAt || now,
        updated_at: now,
      });
      return this.getRegistryRow(row.supplierId);
    },

    getRuntimeState(supplierId) {
      return rowToRuntimeState(
        db.prepare("SELECT * FROM supplier_engine_runtime_state WHERE supplier_id = ?").get(supplierId)
      );
    },

    saveRuntimeState(state) {
      const now = new Date().toISOString();
      upsertRuntime.run({
        supplier_id: state.supplierId,
        sync_status: state.syncStatus || "IDLE",
        health_status: state.healthStatus || "UNKNOWN",
        last_sync_started_at: state.lastSyncStartedAt || null,
        last_sync_completed_at: state.lastSyncCompletedAt || null,
        last_sync_success_at: state.lastSyncSuccessAt || null,
        last_sync_failure_at: state.lastSyncFailureAt || null,
        last_error_code: state.lastErrorCode || null,
        last_error_message_safe: state.lastErrorMessageSafe || null,
        last_sync_job_id: state.lastSyncJobId || null,
        sync_lock_job_id: state.syncLockJobId ?? null,
        sync_lock_acquired_at: state.syncLockAcquiredAt ?? null,
        products_processed: state.productsProcessed ?? null,
        products_accepted: state.productsAccepted ?? null,
        products_rejected: state.productsRejected ?? null,
        offers_updated: state.offersUpdated ?? null,
        stock_updated: state.stockUpdated ?? null,
        price_updated: state.priceUpdated ?? null,
        reliability_score: state.reliabilityScore ?? 0.5,
        updated_at: now,
      });
      return this.getRuntimeState(state.supplierId);
    },

    tryAcquireSyncLock(supplierId, jobId, staleAfterMs = 15 * 60 * 1000) {
      const now = Date.now();
      const existing = this.getRuntimeState(supplierId);
      if (existing?.syncLockJobId && existing.syncLockJobId !== jobId) {
        const acquired = existing.syncLockAcquiredAt ? Date.parse(existing.syncLockAcquiredAt) : now;
        if (Number.isFinite(acquired) && now - acquired < staleAfterMs) {
          return { acquired: false, ownerJobId: existing.syncLockJobId };
        }
      }
      this.saveRuntimeState({
        supplierId,
        syncStatus: existing?.syncStatus || "IDLE",
        healthStatus: existing?.healthStatus || "UNKNOWN",
        syncLockJobId: jobId,
        syncLockAcquiredAt: new Date(now).toISOString(),
        reliabilityScore: existing?.reliabilityScore ?? 0.5,
      });
      return { acquired: true };
    },

    releaseSyncLock(supplierId, jobId) {
      const existing = this.getRuntimeState(supplierId);
      if (!existing || existing.syncLockJobId !== jobId) return false;
      this.saveRuntimeState({
        ...existing,
        syncLockJobId: undefined,
        syncLockAcquiredAt: undefined,
      });
      return true;
    },

    getCursor(supplierId, syncMode = "incremental") {
      return rowToCursor(
        db.prepare("SELECT * FROM supplier_engine_sync_cursors WHERE supplier_id = ? AND sync_mode = ?").get(
          supplierId,
          syncMode
        )
      );
    },

    saveCursor(cursor) {
      const now = new Date().toISOString();
      upsertCursor.run({
        supplier_id: cursor.supplierId,
        sync_mode: cursor.syncMode || "incremental",
        cursor_value: cursor.cursor || null,
        page: cursor.page ?? null,
        offset_value: cursor.offset ?? null,
        last_modified: cursor.lastModified || null,
        updated_at: now,
      });
      return this.getCursor(cursor.supplierId, cursor.syncMode || "incremental");
    },

    clearCursor(supplierId, syncMode = "incremental") {
      db.prepare("DELETE FROM supplier_engine_sync_cursors WHERE supplier_id = ? AND sync_mode = ?").run(
        supplierId,
        syncMode
      );
    },

    getCursorForAdmin(supplierId, syncMode = "incremental") {
      const cursor = this.getCursor(supplierId, syncMode);
      if (!cursor) return null;
      return {
        supplierId: cursor.supplierId,
        syncMode: cursor.syncMode,
        mode: cursor.cursor ? "CURSOR" : cursor.page != null ? "PAGE" : cursor.offset != null ? "OFFSET" : "LAST_MODIFIED",
        valueMasked: maskCursorValue(cursor.cursor),
        page: cursor.page,
        offset: cursor.offset,
        lastModified: cursor.lastModified,
        updatedAt: cursor.updatedAt,
      };
    },

    getHealth(supplierId) {
      return rowToHealth(
        db.prepare("SELECT * FROM supplier_engine_health WHERE supplier_id = ?").get(supplierId)
      );
    },

    saveHealth(health) {
      const now = new Date().toISOString();
      upsertHealth.run({
        supplier_id: health.supplierId,
        health_status: health.healthStatus || "UNKNOWN",
        response_time_ms: health.responseTimeMs || 0,
        error_count: health.errorCount || 0,
        success_count: health.successCount || 0,
        rate_limit_count: health.rateLimitCount || 0,
        consecutive_failures: health.consecutiveFailures || 0,
        last_successful_operation: health.lastSuccessfulOperation || null,
        last_failed_operation: health.lastFailedOperation || null,
        reliability_score: health.reliabilityScore ?? 0.5,
        updated_at: now,
      });
      return this.getHealth(health.supplierId);
    },

    claimIdempotencyKey(key, supplierId) {
      const result = insertIdempotency.run({
        idempotency_key: key,
        supplier_id: supplierId,
        created_at: new Date().toISOString(),
      });
      return result.changes > 0;
    },

    recordAudit(entry) {
      insertAudit.run({
        actor: entry.actor || "system",
        supplier_id: entry.supplierId || null,
        action: entry.action,
        correlation_id: entry.correlationId || null,
        metadata_json: JSON.stringify(redactMetadata(entry.metadata || {})),
        audit_timestamp: entry.timestamp || new Date().toISOString(),
      });
    },

    resetOperationalState(supplierId) {
      db.prepare("DELETE FROM supplier_engine_runtime_state WHERE supplier_id = ?").run(supplierId);
      db.prepare("DELETE FROM supplier_engine_sync_cursors WHERE supplier_id = ?").run(supplierId);
      db.prepare("DELETE FROM supplier_engine_health WHERE supplier_id = ?").run(supplierId);
      db.prepare("DELETE FROM supplier_engine_sync_idempotency WHERE supplier_id = ?").run(supplierId);
      db.prepare("DELETE FROM supplier_engine_order_sandbox WHERE supplier_id = ?").run(supplierId);
    },

    saveOrderSandbox(row) {
      upsertOrderSandbox.run(row);
    },

    getOrderSandboxByIdempotency(key) {
      return db
        .prepare("SELECT * FROM supplier_engine_order_sandbox WHERE idempotency_key = ?")
        .get(key);
    },

    getOrderSandboxByReference(supplierOrderId) {
      return db
        .prepare("SELECT * FROM supplier_engine_order_sandbox WHERE supplier_order_id = ?")
        .get(supplierOrderId);
    },

    getLastOrderSandboxForSupplier(supplierId) {
      return db
        .prepare(
          "SELECT * FROM supplier_engine_order_sandbox WHERE supplier_id = ? ORDER BY updated_at DESC LIMIT 1"
        )
        .get(supplierId);
    },

    listOrderSandbox(supplierId) {
      if (supplierId) {
        return db
          .prepare(
            "SELECT * FROM supplier_engine_order_sandbox WHERE supplier_id = ? ORDER BY updated_at DESC"
          )
          .all(supplierId);
      }
      return db
        .prepare("SELECT * FROM supplier_engine_order_sandbox ORDER BY updated_at DESC")
        .all();
    },

    resetOrderSandbox(supplierId) {
      if (supplierId) {
        db.prepare("DELETE FROM supplier_engine_order_sandbox WHERE supplier_id = ?").run(supplierId);
      } else {
        db.prepare("DELETE FROM supplier_engine_order_sandbox").run();
      }
    },

    listAllRuntimeStates() {
      return db.prepare("SELECT * FROM supplier_engine_runtime_state").all().map(rowToRuntimeState);
    },

    listAllCursors() {
      return db.prepare("SELECT * FROM supplier_engine_sync_cursors").all().map(rowToCursor);
    },

    listAllHealthRecords() {
      return db.prepare("SELECT * FROM supplier_engine_health").all().map(rowToHealth);
    },

    listAudit(supplierId, limit = 50) {
      return db
        .prepare(
          "SELECT * FROM supplier_engine_audit WHERE supplier_id = ? ORDER BY audit_timestamp DESC LIMIT ?"
        )
        .all(supplierId, limit)
        .map((row) => ({
          id: row.id,
          actor: row.actor,
          supplierId: row.supplier_id,
          action: row.action,
          correlationId: row.correlation_id,
          metadata: parseJson(row.metadata_json, {}),
          timestamp: row.audit_timestamp,
        }));
    },
  };
}

module.exports = {
  createPersistentSupplierStore,
  maskCursorValue,
};
