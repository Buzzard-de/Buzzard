const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const operationsControl = require("../lib/operations/operationsControl");
const operationsAudit = require("../lib/operations/operationsAudit");
const { evaluateGoLiveReadiness } = require("../lib/operations/goLiveReadiness");

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
    app.get("/api/admin/operations/summary", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, operations: operationsControl.getOperationsSummary() });
    });

    app.get("/api/admin/operations/audit", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "audit.read")) return;
      res.json({
        success: true,
        audit: operationsAudit.listAudit({
          limit: Number(req.query.limit) || 50,
          action: req.query.action,
          correlationId: req.query.correlationId,
        }),
      });
    });

    app.get("/api/admin/operations/go-live-readiness", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const readiness = await evaluateGoLiveReadiness();
      res.json({ success: true, GO_LIVE_READINESS: readiness });
    });
  },
};
