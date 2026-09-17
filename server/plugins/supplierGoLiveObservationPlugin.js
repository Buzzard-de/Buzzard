/**
 * #346 — Controlled Go-Live Observation Period & Broader Rollout Approval admin API.
 * BROADER_ROLLOUT != UNLIMITED_GLOBAL_GO_LIVE
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let observation = null;

function loadObservation() {
  if (observation) return observation;
  try {
    observation = require("../lib/supplierGoLiveObservation.bundle.cjs");
    observation.hydrateObservationFromPersistence?.();
    return observation;
  } catch (err) {
    console.warn("Supplier go-live observation bundle unavailable:", err.message);
    return null;
  }
}

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = { userId: session.userId, id: session.userId, email: session.email, role: session.role };
  return session;
}

module.exports = {
  register(app) {
    if (process.env.BUZZARD_SUPPLIER_GO_LIVE_OBSERVATION === "0") {
      console.log("Supplier go-live observation API disabled (BUZZARD_SUPPLIER_GO_LIVE_OBSERVATION=0)");
      return;
    }

    app.get("/api/admin/supplier-go-live-observation/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.read")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getObservationDashboard(), source: "supplier-go-live-observation" });
    });

    app.get("/api/admin/supplier-go-live-observation/records/:observationId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.read")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const detail = mod.getObservationDetail(req.params.observationId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "OBSERVATION_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/start", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.manage")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      try {
        const result = mod.startObservation({
          goLiveId: req.body?.goLiveId,
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          requester: req.adminUser.email,
          idempotencyKey: req.body?.idempotencyKey,
        });
        return res.json({ success: true, data: result, safety: mod.getObservationSafetyCounters(), source: "supplier-go-live-observation" });
      } catch (err) {
        return res.status(500).json({ success: false, errorCode: "OBSERVATION_START_FAILED", message: err instanceof Error ? err.message : "Failed" });
      }
    });

    app.post("/api/admin/supplier-go-live-observation/pause", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.manage")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const result = mod.pauseObservation({ observationId: req.body?.observationId, actorId: req.adminUser.email });
      return res.json({ success: result.ok, data: result, source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/complete-review", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.review")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      mod.evaluateObservationCompletion(req.body?.observationId);
      const result = mod.requestObservationReview({
        observationId: req.body?.observationId,
        requester: req.adminUser.email,
      });
      return res.json({ success: true, data: result, source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/request-rollout-approval", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-observation.review")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const result = mod.requestBroaderRolloutApproval({
        observationId: req.body?.observationId,
        requester: req.adminUser.email,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/approve-rollout", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-rollout.approve")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const record = mod.getObservationRecord(req.body?.observationId);
      if (!record) return res.status(404).json({ success: false, errorCode: "OBSERVATION_NOT_FOUND" });
      const result = mod.approveBroaderRollout({
        observationId: req.body.observationId,
        rolloutId: req.body?.rolloutId || record.rolloutId,
        approverId: req.adminUser.email,
        requesterId: req.body?.requesterId || record.requestedBy,
        secondaryApproverId: req.body?.secondaryApproverId,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/activate-rollout", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-rollout.activate")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const result = mod.activateBroaderRollout({
        observationId: req.body?.observationId,
        rolloutId: req.body?.rolloutId,
        actorId: req.adminUser.email,
        approvalId: req.body?.approvalId,
      });
      return res.json({ success: result.ok, data: result, safety: mod.getObservationSafetyCounters(), source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/pause-rollout", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-rollout.activate")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const result = mod.pauseBroaderRollout({ rolloutId: req.body?.rolloutId, actorId: req.adminUser.email });
      return res.json({ success: result.ok, data: result, source: "supplier-go-live-observation" });
    });

    app.post("/api/admin/supplier-go-live-observation/rollback-rollout", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-rollout.rollback")) return;
      const mod = loadObservation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "OBSERVATION_UNAVAILABLE" });
      const result = mod.rollbackBroaderRollout({
        rolloutId: req.body?.rolloutId,
        actorId: req.adminUser.email,
        reason: req.body?.reason,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-go-live-observation" });
    });
  },
};
