function createSupplierGoLiveObservationStore(db) {
  return {
    saveObservation(row) {
      db.prepare(`
        INSERT INTO supplier_go_live_observations (
          observation_id, supplier_id, state, go_live_id, idempotency_key, correlation_id, record_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(observation_id) DO UPDATE SET
          state = excluded.state,
          record_json = excluded.record_json,
          updated_at = excluded.updated_at
      `).run(
        row.observation_id,
        row.supplier_id,
        row.state,
        row.go_live_id,
        row.idempotency_key,
        row.correlation_id,
        row.record_json,
        row.updated_at,
      );
    },
    getObservation(observationId) {
      return db.prepare("SELECT * FROM supplier_go_live_observations WHERE observation_id = ?").get(observationId);
    },
    listObservations(limit = 500) {
      return db.prepare("SELECT * FROM supplier_go_live_observations ORDER BY updated_at DESC LIMIT ?").all(limit);
    },
    saveRollout(row) {
      db.prepare(`
        INSERT INTO supplier_go_live_rollout (
          rollout_id, observation_id, supplier_id, state, idempotency_key, correlation_id, record_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(rollout_id) DO UPDATE SET
          state = excluded.state,
          record_json = excluded.record_json,
          updated_at = excluded.updated_at
      `).run(
        row.rollout_id,
        row.observation_id,
        row.supplier_id,
        row.state,
        row.idempotency_key,
        row.correlation_id,
        row.record_json,
        row.updated_at,
      );
    },
    getRollout(rolloutId) {
      return db.prepare("SELECT * FROM supplier_go_live_rollout WHERE rollout_id = ?").get(rolloutId);
    },
    listRollouts(limit = 500) {
      return db.prepare("SELECT * FROM supplier_go_live_rollout ORDER BY updated_at DESC LIMIT ?").all(limit);
    },
    saveAudit(row) {
      db.prepare(`
        INSERT INTO supplier_go_live_rollout_audit (
          event_id, event_type, observation_id, rollout_id, supplier_id, correlation_id, timestamp, detail_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        row.event_id,
        row.event_type,
        row.observation_id,
        row.rollout_id,
        row.supplier_id,
        row.correlation_id,
        row.timestamp,
        row.detail_json,
      );
    },
    listAudit(limit = 500) {
      return db.prepare("SELECT * FROM supplier_go_live_rollout_audit ORDER BY timestamp DESC LIMIT ?").all(limit);
    },
  };
}

function createSupplierGoLiveObservationStoreFromModule() {
  const { db } = require("../db");
  return createSupplierGoLiveObservationStore(db);
}

module.exports = {
  createSupplierGoLiveObservationStore: createSupplierGoLiveObservationStoreFromModule,
};
