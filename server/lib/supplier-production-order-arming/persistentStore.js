function createSupplierProductionOrderArmingStore(db) {
  return {
    saveArming(row) {
      db.prepare(`
        INSERT INTO supplier_production_order_arming (
          arming_id, supplier_id, market, channel, environment, status,
          idempotency_key, correlation_id, record_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(arming_id) DO UPDATE SET
          status = excluded.status,
          record_json = excluded.record_json,
          updated_at = excluded.updated_at
      `).run(
        row.arming_id,
        row.supplier_id,
        row.market,
        row.channel,
        row.environment,
        row.status,
        row.idempotency_key,
        row.correlation_id,
        row.record_json,
        row.updated_at,
      );
    },
    getArming(armingId) {
      return db.prepare("SELECT * FROM supplier_production_order_arming WHERE arming_id = ?").get(armingId);
    },
    listArmings(limit = 500) {
      return db.prepare("SELECT * FROM supplier_production_order_arming ORDER BY updated_at DESC LIMIT ?").all(limit);
    },
    saveAudit(row) {
      db.prepare(`
        INSERT INTO supplier_production_order_arming_audit (
          event_id, event_type, arming_id, supplier_id, correlation_id, timestamp, detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.event_id,
        row.event_type,
        row.arming_id,
        row.supplier_id,
        row.correlation_id,
        row.timestamp,
        row.detail_json,
      );
    },
    listAudit(limit = 500) {
      return db.prepare("SELECT * FROM supplier_production_order_arming_audit ORDER BY timestamp DESC LIMIT ?").all(limit);
    },
  };
}

function createSupplierProductionOrderArmingStoreFromModule() {
  const { db } = require("../db");
  return createSupplierProductionOrderArmingStore(db);
}

module.exports = {
  createSupplierProductionOrderArmingStore: createSupplierProductionOrderArmingStoreFromModule,
};
