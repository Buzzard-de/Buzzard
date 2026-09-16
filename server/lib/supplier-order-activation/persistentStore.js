const { getDb } = require("../db");

function createSupplierOrderActivationStore() {
  const db = getDb();
  if (!db) return null;

  const saveActivationStmt = db.prepare(`
    INSERT INTO supplier_order_activation (
      activation_id, supplier_id, market, channel, environment,
      status, network_state, idempotency_key, correlation_id,
      record_json, updated_at
    ) VALUES (
      @activation_id, @supplier_id, @market, @channel, @environment,
      @status, @network_state, @idempotency_key, @correlation_id,
      @record_json, @updated_at
    )
    ON CONFLICT(activation_id) DO UPDATE SET
      status = excluded.status,
      network_state = excluded.network_state,
      record_json = excluded.record_json,
      updated_at = excluded.updated_at
  `);

  const getActivationStmt = db.prepare(`
    SELECT * FROM supplier_order_activation WHERE activation_id = ?
  `);

  const listActivationsStmt = db.prepare(`
    SELECT * FROM supplier_order_activation ORDER BY updated_at DESC LIMIT ?
  `);

  const saveFirstOrderStmt = db.prepare(`
    INSERT INTO supplier_first_order_gate (
      first_order_id, activation_id, supplier_id, status,
      idempotency_key, record_json, updated_at
    ) VALUES (
      @first_order_id, @activation_id, @supplier_id, @status,
      @idempotency_key, @record_json, @updated_at
    )
    ON CONFLICT(first_order_id) DO UPDATE SET
      status = excluded.status,
      record_json = excluded.record_json,
      updated_at = excluded.updated_at
  `);

  const getFirstOrderStmt = db.prepare(`
    SELECT * FROM supplier_first_order_gate WHERE first_order_id = ?
  `);

  const listFirstOrdersStmt = db.prepare(`
    SELECT * FROM supplier_first_order_gate ORDER BY updated_at DESC LIMIT ?
  `);

  const saveAuditStmt = db.prepare(`
    INSERT OR REPLACE INTO supplier_order_activation_audit (
      event_id, event_type, activation_id, supplier_id, correlation_id, timestamp, detail_json
    ) VALUES (
      @event_id, @event_type, @activation_id, @supplier_id, @correlation_id, @timestamp, @detail_json
    )
  `);

  const listAuditStmt = db.prepare(`
    SELECT * FROM supplier_order_activation_audit ORDER BY timestamp DESC LIMIT ?
  `);

  return {
    saveActivation(row) {
      saveActivationStmt.run(row);
    },
    getActivation(activationId) {
      return getActivationStmt.get(activationId);
    },
    listActivations(limit = 5000) {
      return listActivationsStmt.all(limit);
    },
    saveFirstOrder(row) {
      saveFirstOrderStmt.run(row);
    },
    getFirstOrder(firstOrderId) {
      return getFirstOrderStmt.get(firstOrderId);
    },
    listFirstOrders(limit = 5000) {
      return listFirstOrdersStmt.all(limit);
    },
    saveAudit(row) {
      saveAuditStmt.run(row);
    },
    listAudit(limit = 5000) {
      return listAuditStmt.all(limit);
    },
  };
}

module.exports = { createSupplierOrderActivationStore };
