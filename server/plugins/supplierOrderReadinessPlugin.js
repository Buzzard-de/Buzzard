/**
 * #337 — Real Supplier Order Production Readiness & Approval Gate API.
 * Readiness / validation / approval / blocking / audit only — no real order dispatch.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let readiness = null;

function loadReadiness() {
  if (readiness) return readiness;
  try {
    readiness = require("../lib/supplierOrderReadiness.bundle.cjs");
    readiness.hydrateReadinessFromPersistence?.();
    return readiness;
  } catch (err) {
    console.warn("Supplier order readiness bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_SUPPLIER_ORDER_READINESS === "0") {
      console.log("Supplier order readiness API disabled (BUZZARD_SUPPLIER_ORDER_READINESS=0)");
      return;
    }

    app.get("/api/admin/supplier-order-readiness/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.read")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getSupplierOrderReadinessDashboard(), source: "supplier-order-readiness" });
    });

    app.get("/api/admin/supplier-order-readiness/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.read")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const rows = mod.listSupplierOrderReadinessRows({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        market: req.query.market ? String(req.query.market) : undefined,
        channel: req.query.channel ? String(req.query.channel) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-order-readiness" });
    });

    app.get("/api/admin/supplier-order-readiness/records/:readinessId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.read")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const detail = mod.getSupplierOrderReadinessDetail(req.params.readinessId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "READINESS_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-order-readiness" });
    });

    app.post("/api/admin/supplier-order-readiness/evaluate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.read")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const scope = {
        supplierId: String(req.body?.supplierId || ""),
        market: String(req.body?.market || "DE"),
        channel: String(req.body?.channel || "DIRECT"),
        environment: req.body?.environment,
      };
      const result = mod.evaluateSupplierOrderReadiness(scope, { force: true });
      return res.json({ success: true, data: result, source: "supplier-order-readiness" });
    });

    app.post("/api/admin/supplier-order-readiness/approval/request", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.request")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const out = mod.requestSupplierOrderApproval({
        readinessId: String(req.body?.readinessId || ""),
        requester: req.adminUser.email,
        correlationId: String(req.body?.correlationId || `req_${Date.now()}`),
        orderRiskLevel: req.body?.orderRiskLevel,
      });
      if (!out.ok) return res.status(400).json({ success: false, errorCode: out.error });
      return res.json({ success: true, data: out.approval, source: "supplier-order-readiness" });
    });

    app.post("/api/admin/supplier-order-readiness/approval/:approvalId/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.approve")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const out = mod.approveSupplierOrderActivation({
        approvalId: req.params.approvalId,
        approver: req.adminUser.email,
        correlationId: String(req.body?.correlationId || `appr_${Date.now()}`),
      });
      if (!out.ok) return res.status(400).json({ success: false, errorCode: out.error });
      return res.json({ success: true, data: out.approval, source: "supplier-order-readiness" });
    });

    app.post("/api/admin/supplier-order-readiness/approval/:approvalId/reject", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.reject")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const out = mod.rejectSupplierOrderApproval({
        approvalId: req.params.approvalId,
        approver: req.adminUser.email,
        reason: String(req.body?.reason || "Rejected"),
        correlationId: String(req.body?.correlationId || `rej_${Date.now()}`),
      });
      if (!out.ok) return res.status(400).json({ success: false, errorCode: out.error });
      return res.json({ success: true, data: out.approval, source: "supplier-order-readiness" });
    });

    app.post("/api/admin/supplier-order-readiness/preview", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.read")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const scope = {
        supplierId: String(req.body?.supplierId || ""),
        market: String(req.body?.market || "DE"),
        channel: String(req.body?.channel || "DIRECT"),
      };
      const preview = mod.buildDryRunActivationPreview(scope, `preview_${Date.now()}`);
      return res.json({ success: true, data: preview, source: "supplier-order-readiness" });
    });

    app.post("/api/admin/supplier-order-readiness/activate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.readiness.admin")) return;
      const mod = loadReadiness();
      if (!mod) return res.status(503).json({ success: false, errorCode: "READINESS_UNAVAILABLE" });
      const result = mod.activateRealSupplierOrders({
        scope: {
          supplierId: String(req.body?.supplierId || ""),
          market: String(req.body?.market || "DE"),
          channel: String(req.body?.channel || "DIRECT"),
        },
        requester: req.adminUser.email,
        correlationId: String(req.body?.correlationId || `act_${Date.now()}`),
        orderValue: req.body?.orderValue != null ? Number(req.body.orderValue) : undefined,
      });
      return res.status(result.blocked ? 403 : 200).json({ success: !result.blocked, data: result, source: "supplier-order-readiness" });
    });
  },
};
