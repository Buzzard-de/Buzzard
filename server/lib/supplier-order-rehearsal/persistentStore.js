/**
 * Supplier Order Rehearsal — SQLite persistence adapter.
 */
const { db } = require("../db");

function createSupplierOrderRehearsalStore() {
  const upsertRehearsal = db.prepare(`
    INSERT INTO supplier_order_rehearsals (
      rehearsal_id, order_id, supplier_id, market, channel,
      overall_status, current_stage, idempotency_key, correlation_id, record_json, updated_at
    ) VALUES (
      @rehearsal_id, @order_id, @supplier_id, @market, @channel,
      @overall_status, @current_stage, @idempotency_key, @correlation_id, @record_json, @updated_at
    )
    ON CONFLICT(rehearsal_id) DO UPDATE SET
      overall_status = excluded.overall_status,
      current_stage = excluded.current_stage,
      record_json = excluded.record_json,
      updated_at = excluded.updated_at
  `);

  const insertAudit = db.prepare(`
    INSERT OR REPLACE INTO supplier_order_rehearsal_audit (
      event_id, event_type, rehearsal_id, order_id, supplier_id, correlation_id, timestamp, detail_json
    ) VALUES (
      @event_id, @event_type, @rehearsal_id, @order_id, @supplier_id, @correlation_id, @timestamp, @detail_json
    )
  `);

  return {
    saveRehearsal(row) {
      upsertRehearsal.run(row);
    },
    getRehearsal(rehearsalId) {
      return db.prepare("SELECT * FROM supplier_order_rehearsals WHERE rehearsal_id = ?").get(rehearsalId);
    },
    listRehearsals(limit = 5000) {
      return db
        .prepare("SELECT * FROM supplier_order_rehearsals ORDER BY updated_at DESC LIMIT ?")
        .all(limit);
    },
    saveAudit(row) {
      insertAudit.run(row);
    },
    listAudit(limit = 500) {
      return db
        .prepare("SELECT * FROM supplier_order_rehearsal_audit ORDER BY timestamp DESC LIMIT ?")
        .all(limit);
    },
  };
}

module.exports = { createSupplierOrderRehearsalStore };
