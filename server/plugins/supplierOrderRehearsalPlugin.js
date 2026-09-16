/**
 * #338 — Supplier Order Go-Live Rehearsal admin API.
 * Simulation only — no real supplier order dispatch.
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");

let rehearsal = null;

function loadRehearsal() {
  if (rehearsal) return rehearsal;
  try {
    rehearsal = require("../lib/supplierOrderRehearsal.bundle.cjs");
    rehearsal.hydrateRehearsalFromPersistence?.();
    return rehearsal;
  } catch (err) {
    console.warn("Supplier order rehearsal bundle unavailable:", err.message);
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
    if (process.env.BUZZARD_SUPPLIER_ORDER_REHEARSAL === "0") {
      console.log("Supplier order rehearsal API disabled (BUZZARD_SUPPLIER_ORDER_REHEARSAL=0)");
      return;
    }

    app.get("/api/admin/supplier-order-rehearsal/dashboard", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.rehearsal.read")) return;
      const mod = loadRehearsal();
      if (!mod) return res.status(503).json({ success: false, errorCode: "REHEARSAL_UNAVAILABLE" });
      return res.json({ success: true, data: mod.getSupplierOrderRehearsalDashboard(), source: "supplier-order-rehearsal" });
    });

    app.get("/api/admin/supplier-order-rehearsal/records", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.rehearsal.read")) return;
      const mod = loadRehearsal();
      if (!mod) return res.status(503).json({ success: false, errorCode: "REHEARSAL_UNAVAILABLE" });
      const rows = mod.listSupplierOrderRehearsalRows({
        supplierId: req.query.supplierId ? String(req.query.supplierId) : undefined,
        market: req.query.market ? String(req.query.market) : undefined,
        channel: req.query.channel ? String(req.query.channel) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
      });
      return res.json({ success: true, data: rows, source: "supplier-order-rehearsal" });
    });

    app.get("/api/admin/supplier-order-rehearsal/records/:rehearsalId", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.rehearsal.read")) return;
      const mod = loadRehearsal();
      if (!mod) return res.status(503).json({ success: false, errorCode: "REHEARSAL_UNAVAILABLE" });
      const detail = mod.getSupplierOrderRehearsalDetail(req.params.rehearsalId);
      if (!detail) return res.status(404).json({ success: false, errorCode: "REHEARSAL_NOT_FOUND" });
      return res.json({ success: true, data: detail, source: "supplier-order-rehearsal" });
    });

    app.post("/api/admin/supplier-order-rehearsal/run", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "supplier-order.rehearsal.run")) return;
      const mod = loadRehearsal();
      if (!mod) return res.status(503).json({ success: false, errorCode: "REHEARSAL_UNAVAILABLE" });
      try {
        const result = await mod.runGoLiveRehearsal({
          market: req.body?.market || "DE",
          channel: req.body?.channel || "DIRECT",
          productId: req.body?.productId,
          orderValue: req.body?.orderValue,
          requester: req.adminUser.email,
          approver: req.body?.approverEmail,
          failureInjection: req.body?.failureInjection,
          correlationId: req.body?.correlationId,
        });
        const safety = mod.assertRehearsalSafetyInvariants();
        return res.json({ success: true, data: result, safety, source: "supplier-order-rehearsal" });
      } catch (err) {
        return res.status(500).json({
          success: false,
          errorCode: "REHEARSAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  },
};
