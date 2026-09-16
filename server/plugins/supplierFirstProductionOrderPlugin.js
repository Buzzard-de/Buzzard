/**
 * #344 — Controlled First Production Order Execution Gate admin API.
 * EXECUTION_AUTHORIZED != EXECUTED — no automatic production orders.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let firstOrder = null;

function loadFirstOrder() {
  if (firstOrder) return firstOrder;
  try {
    firstOrder = require("../lib/supplierFirstProductionOrder.bundle.cjs");
    firstOrder.hydrateFirstProductionOrderFromPersistence?.();
    return firstOrder;
  } catch (err) {
    console.warn("Supplier first production order bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_SUPPLIER_FIRST_PRODUCTION_ORDER === "0") {
      console.log("Supplier first production order API disabled (BUZZARD_SUPPLIER_FIRST_PRODUCTION_ORDER=0)");
      return;
    }

    app.get("/api/admin/supplier-first-production-order/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.read")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getFirstProductionOrderDashboard(), source: "supplier-first-production-order" });
    });

    app.get("/api/admin/supplier-first-production-order/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.read")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      const rows = mod.listFirstProductionOrderRows({
        supplier: req.query.supplier ? String(req.query.supplier) : undefined,
        state: req.query.state ? String(req.query.state) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-first-production-order" });
    });

    app.get("/api/admin/supplier-first-production-order/records/:executionId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.read")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      const detail = mod.getFirstProductionOrderDetail(req.params.executionId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "EXECUTION_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-first-production-order" });
    });

    app.post("/api/admin/supplier-first-production-order/request", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.request")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      try {
        const result = mod.requestFirstProductionOrder({
          armingId: req.body?.armingId,
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          orderId: req.body?.orderId,
          requester: req.adminUser.email,
          idempotencyKey: req.body?.idempotencyKey,
        });
        return res.json({ success: true, data: result, safety: mod.getFirstOrderSafetyCounters(), source: "supplier-first-production-order" });
      } catch (err) {
        return res.status(500).json({ success: false, errorCode: "FIRST_ORDER_REQUEST_FAILED", message: err instanceof Error ? err.message : "Failed" });
      }
    });

    app.post("/api/admin/supplier-first-production-order/approve", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.approve")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      const record = mod.getFirstProductionOrderRecord(req.body?.executionId);
      if (!record) return res.status(404).json({ success: false, errorCode: "EXECUTION_NOT_FOUND" });
      const result = mod.approveFirstProductionOrder({
        executionId: req.body.executionId,
        approverId: req.adminUser.email,
        requesterId: req.body?.requesterId || record.requestedBy,
        secondaryApproverId: req.body?.secondaryApproverId,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-first-production-order" });
    });

    app.post("/api/admin/supplier-first-production-order/authorize", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.execute")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      const result = mod.authorizeFirstProductionOrderExecution({
        executionId: req.body?.executionId,
        actorId: req.adminUser.email,
        approvalId: req.body?.approvalId,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-first-production-order" });
    });

    app.post("/api/admin/supplier-first-production-order/execute", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.execute")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      try {
        const result = await mod.executeFirstProductionOrder({
          executionId: req.body?.executionId,
          authorizationId: req.body?.authorizationId,
          actorId: req.adminUser.email,
        });
        return res.json({ success: result.ok, data: result, safety: mod.getFirstOrderSafetyCounters(), source: "supplier-first-production-order" });
      } catch (err) {
        return res.status(500).json({ success: false, errorCode: "FIRST_ORDER_EXECUTE_FAILED", message: err instanceof Error ? err.message : "Failed" });
      }
    });

    app.post("/api/admin/supplier-first-production-order/cancel", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-first-production-order.request")) return;
      const mod = loadFirstOrder();
      if (!mod) return res.status(503).json({ success: false, errorCode: "FIRST_ORDER_UNAVAILABLE" });
      const result = mod.cancelFirstProductionOrder({
        executionId: req.body?.executionId,
        actorId: req.adminUser.email,
      });
      return res.json({ success: result.ok, data: result, source: "supplier-first-production-order" });
    });
  },
};
