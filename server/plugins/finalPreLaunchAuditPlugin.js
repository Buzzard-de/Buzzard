"use strict";

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const {
  getFinalPreLaunchAudit,
  validateFinalPreLaunchAudit,
} = require("../lib/release/finalPreLaunchAudit");
const { auditFinalPreLaunch } = require("../lib/release/finalPreLaunchAuditLog");
const { sendAdminGateError } = require("../lib/http/publicPluginError");

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
    app.get("/api/admin/release/final-prelaunch", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        const audit = await getFinalPreLaunchAudit();
        res.json({ success: true, ...audit });
      } catch (err) {
        require("../lib/http/publicPluginError").sendPublicError(res, 500, "ops.internalError", err);
      }
    });

    app.get("/api/admin/release/final-prelaunch/audit", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        const audit = await auditFinalPreLaunch();
        res.json({ success: true, ...audit });
      } catch (err) {
        require("../lib/http/publicPluginError").sendPublicError(res, 500, "ops.internalError", err);
      }
    });

    app.post("/api/admin/release/final-prelaunch/validate", async (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        adminSafetyGate.requireAdminAction("go_live", { req, body: req.body, dryRun: true });
      } catch (err) {
        return sendAdminGateError(res, err);
      }
      try {
        const result = await validateFinalPreLaunchAudit();
        res.json({ success: true, ...result });
      } catch (err) {
        require("../lib/http/publicPluginError").sendPublicError(res, 500, "ops.internalError", err);
      }
    });
  },
};
