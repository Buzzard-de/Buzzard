const { getDb } = require("../db");

function createSupplierProductionValidationStore() {
  const db = getDb();
  if (!db) return null;

  const saveValidationStmt = db.prepare(`
    INSERT INTO supplier_production_capability_validation (
      validation_id, supplier_id, market, channel, environment,
      overall_status, credential_status, idempotency_key, correlation_id,
      record_json, updated_at
    ) VALUES (
      @validation_id, @supplier_id, @market, @channel, @environment,
      @overall_status, @credential_status, @idempotency_key, @correlation_id,
      @record_json, @updated_at
    )
    ON CONFLICT(validation_id) DO UPDATE SET
      overall_status = excluded.overall_status,
      credential_status = excluded.credential_status,
      record_json = excluded.record_json,
      updated_at = excluded.updated_at
  `);

  const getValidationStmt = db.prepare(`
    SELECT * FROM supplier_production_capability_validation WHERE validation_id = ?
  `);

  const listValidationsStmt = db.prepare(`
    SELECT * FROM supplier_production_capability_validation
    ORDER BY updated_at DESC LIMIT ?
  `);

  const saveAuditStmt = db.prepare(`
    INSERT OR REPLACE INTO supplier_production_validation_audit (
      event_id, event_type, validation_id, supplier_id, correlation_id, timestamp, detail_json
    ) VALUES (
      @event_id, @event_type, @validation_id, @supplier_id, @correlation_id, @timestamp, @detail_json
    )
  `);

  const listAuditStmt = db.prepare(`
    SELECT * FROM supplier_production_validation_audit ORDER BY timestamp DESC LIMIT ?
  `);

  return {
    saveValidation(row) {
      saveValidationStmt.run(row);
    },
    getValidation(validationId) {
      return getValidationStmt.get(validationId);
    },
    listValidations(limit = 5000) {
      return listValidationsStmt.all(limit);
    },
    saveAudit(row) {
      saveAuditStmt.run(row);
    },
    listAudit(limit = 5000) {
      return listAuditStmt.all(limit);
    },
  };
}

module.exports = { createSupplierProductionValidationStore };
