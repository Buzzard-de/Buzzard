function createSupplierControlledGoLiveStore(db) {
  return {
    saveGoLive(row) {
      db.prepare(`
        INSERT INTO supplier_controlled_go_live (
          go_live_id, supplier_id, state, idempotency_key, correlation_id, record_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(go_live_id) DO UPDATE SET
          state = excluded.state,
          record_json = excluded.record_json,
          updated_at = excluded.updated_at
      `).run(
        row.go_live_id,
        row.supplier_id,
        row.state,
        row.idempotency_key,
        row.correlation_id,
        row.record_json,
        row.updated_at,
      );
    },
    getGoLive(goLiveId) {
      return db.prepare("SELECT * FROM supplier_controlled_go_live WHERE go_live_id = ?").get(goLiveId);
    },
    listGoLives(limit = 500) {
      return db.prepare("SELECT * FROM supplier_controlled_go_live ORDER BY updated_at DESC LIMIT ?").all(limit);
    },
    saveAudit(row) {
      db.prepare(`
        INSERT INTO supplier_controlled_go_live_audit (
          event_id, event_type, go_live_id, supplier_id, correlation_id, timestamp, detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.event_id,
        row.event_type,
        row.go_live_id,
        row.supplier_id,
        row.correlation_id,
        row.timestamp,
        row.detail_json,
      );
    },
    listAudit(limit = 500) {
      return db.prepare("SELECT * FROM supplier_controlled_go_live_audit ORDER BY timestamp DESC LIMIT ?").all(limit);
    },
  };
}

function createSupplierControlledGoLiveStoreFromModule() {
  const { db } = require("../db");
  return createSupplierControlledGoLiveStore(db);
}

module.exports = {
  createSupplierControlledGoLiveStore: createSupplierControlledGoLiveStoreFromModule,
};
