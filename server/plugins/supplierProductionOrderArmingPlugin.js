/**
 * #343 — Inter Cars Production Order Arming admin API.
 * ARMED != EXECUTED — no automatic production orders.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let arming = null;

function loadArming() {
  if (arming) return arming;
  try {
    arming = require("../lib/supplierProductionOrderArming.bundle.cjs");
    arming.hydrateArmingFromPersistence?.();
    return arming;
  } catch (err) {
    console.warn("Supplier production order arming bundle unavailable:", err.message);
    return null;
  }
}

function attachAdmin(req, res) {
  const session = requireAuth(req, res);
  if (!session) return null;
  req.adminUser = {
    userId: session.userId,
    id: session.userId,
    email: session.email,
    role: session.role,
  };
  return session;
}

module.exports = {
  register(app) {
    if (process.env.BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING === "0") {
      console.log("Supplier production order arming API disabled (BUZZARD_SUPPLIER_PRODUCTION_ORDER_ARMING=0)");
      return;
    }

    app.get("/api/admin/supplier-production-order-arming/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.read")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getProductionArmingDashboard(), source: "supplier-production-order-arming" });
    });

    app.get("/api/admin/supplier-production-order-arming/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.read")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      const rows = mod.listProductionArmingRows({
        supplier: req.query.supplier ? String(req.query.supplier) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-production-order-arming" });
    });

    app.get("/api/admin/supplier-production-order-arming/records/:armingId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.read")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      const detail = mod.getProductionArmingDetail(req.params.armingId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "ARMING_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-production-order-arming" });
    });

    app.post("/api/admin/supplier-production-order-arming/request", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.request")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      try {
        const result = mod.requestProductionOrderArming({
          supplier: req.body?.supplier,
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          environment: req.body?.environment,
          currency: req.body?.currency,
          requester: req.adminUser.email,
          idempotencyKey: req.body?.idempotencyKey,
        });
        return res.json({ success: true, data: result, safety: mod.getArmingSafetyCounters(), source: "supplier-production-order-arming" });
      } catch (err) {
        return res.status(500).json({ success: false, errorCode: "ARMING_REQUEST_FAILED", message: err instanceof Error ? err.message : "Failed" });
      }
    });

    app.post("/api/admin/supplier-production-order-arming/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.approve")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      const record = mod.getArmingRecord(req.body?.armingId);
      if (!record) return res.status(404).json({ success: false, errorCode: "ARMING_NOT_FOUND" });
      const result = mod.approveProductionOrderArming({
        armingId: req.body.armingId,
        approverId: req.adminUser.email,
        requesterId: req.body?.requesterId || record.requestedBy,
        scope: record.scope,
        limits: record.limits,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-production-order-arming" });
    });

    app.post("/api/admin/supplier-production-order-arming/arm", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.arm")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      const result = mod.armProductionOrder({
        armingId: req.body?.armingId,
        actorId: req.adminUser.email,
        approvalId: req.body?.approvalId,
      });
      return res.json({ success: result.ok, data: result, safety: mod.getArmingSafetyCounters(), source: "supplier-production-order-arming" });
    });

    app.post("/api/admin/supplier-production-order-arming/disarm", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.disarm")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      const result = mod.disarmProductionOrder({
        armingId: req.body?.armingId,
        actorId: req.adminUser.email,
        reason: req.body?.reason,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-production-order-arming" });
    });

    app.post("/api/admin/supplier-production-order-arming/preflight", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-production-order-arming.read")) return;
      const mod = loadArming();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ARMING_UNAVAILABLE" });
      const result = mod.runProductionArmingPreflight({
        supplier: req.body?.supplier,
        market: req.body?.market || "DE",
        channel: req.body?.channel || "DIRECT",
        requester: req.adminUser.email,
      });
      return res.json({ success: true, data: result, source: "supplier-production-order-arming" });
    });
  },
};
