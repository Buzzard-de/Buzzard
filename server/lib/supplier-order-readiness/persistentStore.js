/**
 * Supplier Order Readiness — SQLite persistence adapter.
 */
const { db } = require("../db");

function createSupplierOrderReadinessStore() {
  const upsertReadiness = db.prepare(`
    INSERT INTO supplier_order_readiness (
      readiness_id, supplier_id, market, channel, overall_status, approval_status,
      generated_at, expires_at, record_json, updated_at
    ) VALUES (
      @readiness_id, @supplier_id, @market, @channel, @overall_status, @approval_status,
      @generated_at, @expires_at, @record_json, @updated_at
    )
    ON CONFLICT(readiness_id) DO UPDATE SET
      overall_status = excluded.overall_status,
      approval_status = excluded.approval_status,
      expires_at = excluded.expires_at,
      record_json = excluded.record_json,
      updated_at = excluded.updated_at
  `);

  const upsertApproval = db.prepare(`
    INSERT INTO supplier_order_approvals (
      approval_id, readiness_id, supplier_id, market, channel, status,
      requester, approver, requested_at, approved_at, rejected_at, rejection_reason,
      expires_at, record_json, updated_at
    ) VALUES (
      @approval_id, @readiness_id, @supplier_id, @market, @channel, @status,
      @requester, @approver, @requested_at, @approved_at, @rejected_at, @rejection_reason,
      @expires_at, @record_json, @updated_at
    )
    ON CONFLICT(approval_id) DO UPDATE SET
      status = excluded.status,
      approver = excluded.approver,
      approved_at = excluded.approved_at,
      rejected_at = excluded.rejected_at,
      rejection_reason = excluded.rejection_reason,
      expires_at = excluded.expires_at,
      record_json = excluded.record_json,
      updated_at = excluded.updated_at
  `);

  const insertAudit = db.prepare(`
    INSERT OR REPLACE INTO supplier_order_readiness_audit (
      event_id, event_type, supplier_id, market, channel, actor, correlation_id, timestamp, detail_json
    ) VALUES (
      @event_id, @event_type, @supplier_id, @market, @channel, @actor, @correlation_id, @timestamp, @detail_json
    )
  `);

  const upsertKillSwitch = db.prepare(`
    INSERT INTO supplier_order_kill_switch (id, state_json, updated_at, updated_by)
    VALUES (1, @state_json, @updated_at, @updated_by)
    ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `);

  return {
    saveReadiness(row) {
      upsertReadiness.run(row);
    },
    getReadiness(readinessId) {
      return db.prepare("SELECT * FROM supplier_order_readiness WHERE readiness_id = ?").get(readinessId);
    },
    listReadiness() {
      return db.prepare("SELECT * FROM supplier_order_readiness ORDER BY updated_at DESC").all();
    },
    saveApproval(row) {
      upsertApproval.run(row);
    },
    getApproval(approvalId) {
      return db.prepare("SELECT * FROM supplier_order_approvals WHERE approval_id = ?").get(approvalId);
    },
    listApprovals() {
      return db.prepare("SELECT * FROM supplier_order_approvals ORDER BY requested_at DESC").all();
    },
    saveAudit(row) {
      insertAudit.run(row);
    },
    listAudit(limit = 500) {
      return db.prepare("SELECT * FROM supplier_order_readiness_audit ORDER BY timestamp DESC LIMIT ?").all(limit);
    },
    saveKillSwitch(row) {
      upsertKillSwitch.run(row);
    },
    getKillSwitch() {
      return db.prepare("SELECT * FROM supplier_order_kill_switch WHERE id = 1").get();
    },
  };
}

module.exports = { createSupplierOrderReadinessStore };
