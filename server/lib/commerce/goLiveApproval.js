/**
 * Part 8 — Go-Live approval foundation (does NOT enable SALES in Part 8)
 */
const crypto = require("crypto");
const { db } = require("../db");
const commerceReadiness = require("./commerceReadiness");
const { logSecurityEvent } = require("../securityLog");
const orderService = require("./orderService");

const PRODUCTION_SAFETY_LOCK = true;

function newId() {
  return `gl_${crypto.randomBytes(8).toString("hex")}`;
}

function requestGoLive({ requestedBy, notes } = {}) {
  const readiness = commerceReadiness.runReadinessGate();
  const id = newId();

  db.prepare(`
    INSERT INTO commerce_go_live(id, requested_by, status, readiness_snapshot_json, admin_approval, production_lock, notes)
    VALUES (?, ?, 'PENDING', ?, 0, 1, ?)
  `).run(id, requestedBy || null, JSON.stringify(readiness), notes || null);

  logSecurityEvent({
    type: "go_live_requested",
    success: true,
    userId: requestedBy,
    detail: { requestId: id, overall: readiness.overall },
  });

  return { id, status: "PENDING", readiness, productionSafetyLock: PRODUCTION_SAFETY_LOCK };
}

function approveGoLive({ requestId, decidedBy } = {}) {
  const row = db.prepare("SELECT * FROM commerce_go_live WHERE id = ?").get(requestId);
  if (!row) return { error: "request_not_found", status: 404 };

  db.prepare(`
    UPDATE commerce_go_live SET status = 'APPROVED', admin_approval = 1, decided_at = CURRENT_TIMESTAMP, decided_by = ?
    WHERE id = ?
  `).run(decidedBy || null, requestId);

  logSecurityEvent({
    type: "go_live_approved",
    success: true,
    userId: decidedBy,
    detail: { requestId, salesActivated: false, productionSafetyLock: PRODUCTION_SAFETY_LOCK },
  });

  orderService.auditCommerceAction("go_live_approved", { type: "admin", id: decidedBy }, { requestId });

  return {
    id: requestId,
    status: "APPROVED",
    salesEnabled: false,
    message: "Go-live approved in foundation only — BUZZARD_SALES_ENABLED remains locked",
    productionSafetyLock: PRODUCTION_SAFETY_LOCK,
    requiresManualSalesActivation: true,
  };
}

function rejectGoLive({ requestId, decidedBy, reason } = {}) {
  const row = db.prepare("SELECT * FROM commerce_go_live WHERE id = ?").get(requestId);
  if (!row) return { error: "request_not_found", status: 404 };

  db.prepare(`
    UPDATE commerce_go_live SET status = 'REJECTED', decided_at = CURRENT_TIMESTAMP, decided_by = ?, notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(decidedBy || null, reason || null, requestId);

  return { id: requestId, status: "REJECTED" };
}

function listGoLiveRequests(limit = 20) {
  return db
    .prepare("SELECT id, requested_by, status, admin_approval, production_lock, created_at, decided_at FROM commerce_go_live ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}

function canActivateSales() {
  const readiness = commerceReadiness.runReadinessGate();
  const latest = db.prepare("SELECT * FROM commerce_go_live WHERE status = 'APPROVED' ORDER BY decided_at DESC LIMIT 1").get();

  if (PRODUCTION_SAFETY_LOCK) {
    return {
      allowed: false,
      code: "production_safety_lock",
      message: "Part 8 production safety lock prevents automatic sales activation",
      readiness: readiness.overall,
      adminApproved: Boolean(latest),
    };
  }

  const blockers = readiness.checks.filter((c) => c.status === "FAIL").length;
  return {
    allowed: readiness.overall === "READY" && blockers === 0 && Boolean(latest),
    readiness: readiness.overall,
    blockers,
    adminApproved: Boolean(latest),
  };
}

module.exports = {
  requestGoLive,
  approveGoLive,
  rejectGoLive,
  listGoLiveRequests,
  canActivateSales,
  PRODUCTION_SAFETY_LOCK,
};
