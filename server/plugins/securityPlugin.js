const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { listSecurityEvents } = require("../lib/securityLog");

module.exports = {
  register(app) {
    app.get("/api/security/health", (_req, res) => {
      return res.json({
        success: true,
        status: "ok",
        protections: {
          serverSideAuthorization: true,
          rateLimiting: true,
          passwordHashing: "scrypt",
          paymentServerVerification: true,
          auditLogging: true,
        },
      });
    });

    app.get("/api/admin/security/events", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (req.adminUser.role !== "administrator") {
        return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      }
      return res.json({ success: true, events: listSecurityEvents(200) });
    });
  },
};
