/**
 * #340 — Inter Cars Production Activation Safety & First-Order Controlled Gate admin API.
 * No real supplier order dispatch — network remains disabled by default.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let activation = null;

function loadActivation() {
  if (activation) return activation;
  try {
    activation = require("../lib/supplierOrderActivation.bundle.cjs");
    activation.hydrateActivationFromPersistence?.();
    return activation;
  } catch (err) {
    console.warn("Supplier order activation bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_SUPPLIER_ORDER_ACTIVATION === "0") {
      console.log("Supplier order activation API disabled (BUZZARD_SUPPLIER_ORDER_ACTIVATION=0)");
      return;
    }

    app.get("/api/admin/supplier-order-activation/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.read")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      return res.json({
        success: true,
        data: mod.getSupplierOrderActivationDashboard(),
        source: "supplier-order-activation",
      });
    });

    app.get("/api/admin/supplier-order-activation/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.read")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const rows = mod.listSupplierOrderActivationRows({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-order-activation" });
    });

    app.get("/api/admin/supplier-order-activation/records/:activationId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.read")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const detail = mod.getSupplierOrderActivationDetail(req.params.activationId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "ACTIVATION_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/preflight", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.preflight")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.runActivationPreflight({
        supplierId: req.body?.supplierId,
        market: req.body?.market || "DE",
        channel: req.body?.channel || "DIRECT",
        environment: req.body?.environment || "PRODUCTION",
        requester: req.adminUser.email,
        correlationId: req.body?.correlationId,
        orderValue: req.body?.orderValue,
        rehearsalId: req.body?.rehearsalId,
      });
      return res.json({ success: true, data: result, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/request", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.request")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.createActivationRequest({
        supplierId: req.body?.supplierId,
        market: req.body?.market || "DE",
        channel: req.body?.channel || "DIRECT",
        environment: req.body?.environment || "PRODUCTION",
        requester: req.adminUser.email,
        correlationId: req.body?.correlationId,
        idempotencyKey: req.body?.idempotencyKey,
        maxOrderValue: req.body?.maxOrderValue,
        rehearsalId: req.body?.rehearsalId,
      });
      const safety = mod.getActivationSafetyCounters();
      return res.json({ success: true, data: result, safety, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/:activationId/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.approve")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.approveActivationRequest({
        activationId: req.params.activationId,
        approverId: req.adminUser.email,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/:activationId/reject", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.approve")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.rejectActivationRequest({
        activationId: req.params.activationId,
        approverId: req.adminUser.email,
        reason: req.body?.reason || "Rejected",
      });
      return res.json({ success: result.ok, data: result, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/:activationId/arm", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.arm")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.armActivation({
        activationId: req.params.activationId,
        actorId: req.adminUser.email,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/:activationId/confirm", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.confirm")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.confirmActivation({
        activationId: req.params.activationId,
        actorId: req.adminUser.email,
        approvalId: req.body?.approvalId,
        confirmationNonce: req.body?.confirmationNonce,
        idempotencyKey: req.body?.idempotencyKey,
      });
      const safety = mod.getActivationSafetyCounters();
      return res.json({ success: result.ok, data: result, safety, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/:activationId/revoke", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.revoke")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.revokeActivation({
        activationId: req.params.activationId,
        actorId: req.adminUser.email,
        reason: req.body?.reason || "Revoked",
      });
      return res.json({ success: result.ok, data: result, source: "supplier-order-activation" });
    });

    app.post("/api/admin/supplier-order-activation/:activationId/cancel", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.activation.admin")) return;
      const mod = loadActivation();
      if (!mod) return res.status(503).json({ success: false, errorCode: "ACTIVATION_UNAVAILABLE" });
      const result = mod.cancelActivation({
        activationId: req.params.activationId,
        actorId: req.adminUser.email,
        reason: req.body?.reason,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-order-activation" });
    });
  },
};
