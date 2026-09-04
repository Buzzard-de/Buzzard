"use strict";

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const {
  getFinalGoLiveReadiness,
  validateFinalGoLiveReadiness,
} = require("../lib/release/finalGoLiveReadiness");
const { auditFinalGoLive } = require("../lib/release/finalGoLiveAudit");

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
    app.get("/api/admin/release/final-go-live", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, ...getFinalGoLiveReadiness() });
    });

    app.get("/api/admin/release/final-go-live/audit", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, ...auditFinalGoLive() });
    });

    app.post("/api/admin/release/final-go-live/validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        adminSafetyGate.requireAdminAction("go_live", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      res.json({ success: true, ...validateFinalGoLiveReadiness() });
    });
  },
};
