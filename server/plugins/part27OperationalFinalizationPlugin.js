"use strict";

const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const adminSafetyGate = require("../lib/operations/adminSafetyGate");
const {
  buildPart27Readiness,
  buildPart27Audit,
} = require("../lib/operations/part27OperationalFinalization");

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
    app.get("/api/health/part27-readiness", (_req, res) => {
      res.json({
        success: true,
        ...buildPart27Readiness(),
        diagnosticOnly: true,
        autoActivate: false,
      });
    });

    app.get("/api/admin/operations/part27-readiness", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      res.json({ success: true, ...buildPart27Readiness() });
    });

    app.get("/api/admin/operations/part27-audit", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "audit.read")) return;
      const readiness = buildPart27Readiness();
      res.json({ success: true, ...buildPart27Audit(readiness) });
    });

    app.post("/api/admin/operations/part27-validate", (req, res) => {
      if (!attachAdmin(req, res)) return;
      if (!requirePermission(req, res, "system.read")) return;
      try {
        adminSafetyGate.requireAdminAction("go_live", { req, body: req.body, dryRun: true });
      } catch (err) {
        return res.status(403).json({ success: false, error: err.code, message: err.message });
      }
      res.json({
        success: true,
        ...buildPart27Readiness(),
        dryRun: true,
        diagnosticOnly: true,
        autoActivate: false,
      });
    });
  },
};
