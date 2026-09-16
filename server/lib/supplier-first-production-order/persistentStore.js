function createSupplierFirstProductionOrderStore(db) {
  return {
    saveExecution(row) {
      db.prepare(`
        INSERT INTO supplier_first_production_orders (
          execution_id, order_id, supplier_id, state,
          idempotency_key, correlation_id, record_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(execution_id) DO UPDATE SET
          state = excluded.state,
          record_json = excluded.record_json,
          updated_at = excluded.updated_at
      `).run(
        row.execution_id,
        row.order_id,
        row.supplier_id,
        row.state,
        row.idempotency_key,
        row.correlation_id,
        row.record_json,
        row.updated_at,
      );
    },
    getExecution(executionId) {
      return db.prepare("SELECT * FROM supplier_first_production_orders WHERE execution_id = ?").get(executionId);
    },
    listExecutions(limit = 500) {
      return db.prepare("SELECT * FROM supplier_first_production_orders ORDER BY updated_at DESC LIMIT ?").all(limit);
    },
    saveAudit(row) {
      db.prepare(`
        INSERT INTO supplier_first_production_order_audit (
          event_id, event_type, execution_id, supplier_id, correlation_id, timestamp, detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.event_id,
        row.event_type,
        row.execution_id,
        row.supplier_id,
        row.correlation_id,
        row.timestamp,
        row.detail_json,
      );
    },
    listAudit(limit = 500) {
      return db.prepare("SELECT * FROM supplier_first_production_order_audit ORDER BY timestamp DESC LIMIT ?").all(limit);
    },
  };
}

function createSupplierFirstProductionOrderStoreFromModule() {
  const { db } = require("../db");
  return createSupplierFirstProductionOrderStore(db);
}

module.exports = {
  createSupplierFirstProductionOrderStore: createSupplierFirstProductionOrderStoreFromModule,
};
