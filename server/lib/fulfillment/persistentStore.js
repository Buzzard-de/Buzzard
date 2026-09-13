/**
 * Fulfillment Control Tower — SQLite persistence adapter.
 */
const { db } = require("../db");

function createFulfillmentControlTowerStore() {
  const upsertSnapshot = db.prepare(`
    INSERT INTO fulfillment_control_tower_snapshots (
      fulfillment_id, order_id, supplier_id, operational_status, view_json, last_reconciled_at, updated_at
    ) VALUES (
      @fulfillment_id, @order_id, @supplier_id, @operational_status, @view_json, @last_reconciled_at, @updated_at
    )
    ON CONFLICT(fulfillment_id) DO UPDATE SET
      operational_status = excluded.operational_status,
      view_json = excluded.view_json,
      last_reconciled_at = excluded.last_reconciled_at,
      updated_at = excluded.updated_at
  `);

  const upsertIncident = db.prepare(`
    INSERT INTO fulfillment_control_tower_incidents (
      incident_id, fingerprint, fulfillment_id, order_id, supplier_id,
      severity, category, code, message, detected_at, resolved_at, status,
      correlation_id, resolution_note, resolution_actor, acknowledged_at, acknowledged_by
    ) VALUES (
      @incident_id, @fingerprint, @fulfillment_id, @order_id, @supplier_id,
      @severity, @category, @code, @message, @detected_at, @resolved_at, @status,
      @correlation_id, @resolution_note, @resolution_actor, @acknowledged_at, @acknowledged_by
    )
    ON CONFLICT(fingerprint) DO UPDATE SET
      severity = excluded.severity,
      message = excluded.message,
      resolved_at = excluded.resolved_at,
      status = excluded.status,
      resolution_note = excluded.resolution_note,
      resolution_actor = excluded.resolution_actor,
      acknowledged_at = excluded.acknowledged_at,
      acknowledged_by = excluded.acknowledged_by
  `);

  const insertRun = db.prepare(`
    INSERT OR REPLACE INTO fulfillment_control_tower_reconciliation_runs (
      run_id, correlation_id, started_at, completed_at,
      checked_fulfillments, passed, warnings, mismatches, critical,
      incidents_created, incidents_resolved, duration_ms, errors_json
    ) VALUES (
      @run_id, @correlation_id, @started_at, @completed_at,
      @checked_fulfillments, @passed, @warnings, @mismatches, @critical,
      @incidents_created, @incidents_resolved, @duration_ms, @errors_json
    )
  `);

  return {
    saveSnapshot(row) {
      upsertSnapshot.run(row);
    },

    getSnapshot(fulfillmentId) {
      return db
        .prepare("SELECT * FROM fulfillment_control_tower_snapshots WHERE fulfillment_id = ?")
        .get(fulfillmentId);
    },

    listSnapshots() {
      return db.prepare("SELECT * FROM fulfillment_control_tower_snapshots ORDER BY updated_at DESC").all();
    },

    saveIncident(row) {
      upsertIncident.run(row);
    },

    getIncidentByFingerprint(fingerprint) {
      return db
        .prepare("SELECT * FROM fulfillment_control_tower_incidents WHERE fingerprint = ?")
        .get(fingerprint);
    },

    listIncidents() {
      return db
        .prepare("SELECT * FROM fulfillment_control_tower_incidents ORDER BY detected_at DESC")
        .all();
    },

    saveReconciliationRun(row) {
      insertRun.run(row);
    },

    listReconciliationRuns(limit = 20) {
      return db
        .prepare("SELECT * FROM fulfillment_control_tower_reconciliation_runs ORDER BY started_at DESC LIMIT ?")
        .all(limit);
    },

    resetAll() {
      db.prepare("DELETE FROM fulfillment_control_tower_snapshots").run();
      db.prepare("DELETE FROM fulfillment_control_tower_incidents").run();
      db.prepare("DELETE FROM fulfillment_control_tower_reconciliation_runs").run();
    },
  };
}

module.exports = { createFulfillmentControlTowerStore };
