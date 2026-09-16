/**
 * #345 — Post-First-Order Validation & Controlled Go-Live Gate admin API.
 * CONTROLLED_GO_LIVE != UNLIMITED_GO_LIVE
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let goLive = null;

function loadGoLive() {
  if (goLive) return goLive;
  try {
    goLive = require("../lib/supplierControlledGoLive.bundle.cjs");
    goLive.hydrateControlledGoLiveFromPersistence?.();
    return goLive;
  } catch (err) {
    console.warn("Supplier controlled go-live bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_SUPPLIER_CONTROLLED_GO_LIVE === "0") {
      console.log("Supplier controlled go-live API disabled (BUZZARD_SUPPLIER_CONTROLLED_GO_LIVE=0)");
      return;
    }

    app.get("/api/admin/supplier-controlled-go-live/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.read")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getControlledGoLiveDashboard(), source: "supplier-controlled-go-live" });
    });

    app.get("/api/admin/supplier-controlled-go-live/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.read")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      return res.json({
        success: true,
        data: mod.listControlledGoLiveRows({
          supplier: req.query.supplier ? String(req.query.supplier) : undefined,
          state: req.query.state ? String(req.query.state) : undefined,
        }),
        source: "supplier-controlled-go-live",
      });
    });

    app.get("/api/admin/supplier-controlled-go-live/records/:goLiveId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.read")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      const detail = mod.getControlledGoLiveDetail(req.params.goLiveId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "GO_LIVE_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-controlled-go-live" });
    });

    app.post("/api/admin/supplier-controlled-go-live/request-review", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.review")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      try {
        const result = mod.requestGoLiveReview({
          executionId: req.body?.executionId,
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          requester: req.adminUser.email,
          idempotencyKey: req.body?.idempotencyKey,
        });
        return res.json({ success: true, data: result, safety: mod.getGoLiveSafetyCounters(), source: "supplier-controlled-go-live" });
      } catch (err) {
        return res.status(500).json({ success: false, errorCode: "GO_LIVE_REQUEST_FAILED", message: err instanceof Error ? err.message : "Failed" });
      }
    });

    app.post("/api/admin/supplier-controlled-go-live/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.approve")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      const record = mod.getControlledGoLiveRecord(req.body?.goLiveId);
      if (!record) return res.status(404).json({ success: false, errorCode: "GO_LIVE_NOT_FOUND" });
      const result = mod.approveControlledGoLive({
        goLiveId: req.body.goLiveId,
        approverId: req.adminUser.email,
        requesterId: req.body?.requesterId || record.requestedBy,
        secondaryApproverId: req.body?.secondaryApproverId,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-controlled-go-live" });
    });

    app.post("/api/admin/supplier-controlled-go-live/activate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.activate")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      const result = mod.activateControlledGoLive({
        goLiveId: req.body?.goLiveId,
        actorId: req.adminUser.email,
        approvalId: req.body?.approvalId,
      });
      return res.json({ success: result.ok, data: result, safety: mod.getGoLiveSafetyCounters(), source: "supplier-controlled-go-live" });
    });

    app.post("/api/admin/supplier-controlled-go-live/rollback", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.rollback")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      const result = mod.rollbackControlledGoLive({
        goLiveId: req.body?.goLiveId,
        actorId: req.adminUser.email,
        reason: req.body?.reason,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-controlled-go-live" });
    });

    app.post("/api/admin/supplier-controlled-go-live/pause", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-controlled-go-live.activate")) return;
      const mod = loadGoLive();
      if (!mod) return res.status(503).json({ success: false, errorCode: "GO_LIVE_UNAVAILABLE" });
      const result = mod.pauseControlledGoLive({ goLiveId: req.body?.goLiveId, actorId: req.adminUser.email });
      return res.json({ success: result.ok, data: result, source: "supplier-controlled-go-live" });
    });
  },
};
