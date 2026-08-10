const { requireAuth } = require("../lib/auth");
const { listSecurityEvents } = require("../lib/securityLog");
const { listLockouts } = require("../lib/accountLockout");

function buildOverview(events) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recent = events.filter((event) => new Date(event.timestamp).getTime() >= dayAgo);

  const countByType = (type) => recent.filter((event) => event.type === type).length;
  const failedTypes = new Set([
    "admin_login_failed",
    "admin_login_2fa_failed",
    "auth_login_failed",
    "admin_login_rate_limited",
    "auth_login_rate_limited",
    "admin_login_locked",
    "admin_account_locked",
    "auth_account_locked",
  ]);

  return {
    windowHours: 24,
    totalEvents24h: recent.length,
    failedLogins24h: recent.filter((event) => failedTypes.has(event.type)).length,
    adminFailures24h: countByType("admin_login_failed") + countByType("admin_login_2fa_failed"),
    rateLimited24h:
      countByType("admin_login_rate_limited") +
      countByType("auth_login_rate_limited") +
      countByType("api_rate_limited"),
    successfulAdminLogins24h: countByType("admin_login"),
    lockoutsActive: listLockouts(100).filter((entry) => entry.locked).length,
  };
}

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
          accountLockout: true,
          adminTwoFactor: true,
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
      const events = listSecurityEvents(200);
      return res.json({
        success: true,
        events,
        overview: buildOverview(events),
        lockouts: listLockouts(50),
      });
    });
  },
};
