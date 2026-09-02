/**
 * Part 20 — Admin operations API (readiness, dashboard, audit, incidents).
 */
const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const operationsControl = require("../lib/operations/operationsControl");
const operationsAudit = require("../lib/operations/operationsAudit");
const { evaluateGoLiveReadiness } = require("../lib/operations/goLiveReadiness");
const adminReadiness = require("../lib/operations/adminReadiness");
const incidentReadiness = require("../lib/operations/incidentReadiness");
const { recordAdminAction } = require("../lib/operations/adminActionAudit");
const { AUDIT_ACTIONS } = require("../core/operationsConstants");

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
      recordAdminAction(req, {
        action: AUDIT_ACTIONS.ADMIN_CHANGE,
        resource: "operations_audit",
        resourceId: "list",
        result: "success",
        metadata: { correlationId: req.query.correlationId || null },
      });
      res.json({
        success: true,
        audit: operationsAudit.listAudit({
          limit: Number(req.query.limit) || 50,
          action: req.query.action,
          resource: req.query.resource,
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

    app.get("/api/admin/operations/readiness", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const report = await adminReadiness.evaluateAdminReadiness();
      res.json({ success: true, ...report });
    });

    app.get("/api/admin/operations/dashboard", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const dashboard = await adminReadiness.getAdminDashboardSnapshot();
      res.json({ success: true, dashboard });
    });

    app.get("/api/admin/operations/incidents", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      const incidents = await incidentReadiness.getIncidentReadiness();
      res.json({ success: true, incidents });
    });
  },
};
