const { requireAuth } = require("../lib/auth");
const { requirePermission } = require("../lib/rbac");
const { querySecurityEvents, listSecurityEvents } = require("../lib/securityLog");
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
    "permission_denied",
    "privilege_escalation_attempt",
    "csrf_failure",
    "idor_attempt",
    "ai_permission_violation",
    "session_revoked",
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
          globalRbac: true,
          unifiedAuthFacade: true,
          rateLimiting: true,
          rateLimitPersist: process.env.BUZZARD_RATE_LIMIT_STORE === "file" || process.env.BUZZARD_RATE_LIMIT_PERSIST === "1",
          rateLimitBackend: require("../lib/rateLimitStore").getStoreInfo().backend,
          rateLimitInfo: require("../lib/rateLimitStore").getStoreInfo(),
          redisConfigured: require("../lib/redisClient").isConfigured(),
          passwordHashing: "scrypt",
          accountLockout: true,
          adminTwoFactor: true,
          csrfBearerExempt: true,
          auditLogging: true,
        },
      });
    });

    app.get("/api/admin/security/events", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "security.read")) return;
      const { severity, type, user, source, from, to, q, page, limit } = req.query || {};
      const result = querySecurityEvents({ severity, type, user, source, from, to, q, page, limit });
      const allForOverview = listSecurityEvents(500);
      return res.json({
        success: true,
        events: result.events,
        pagination: result.pagination,
        overview: buildOverview(allForOverview),
        lockouts: listLockouts(50),
      });
    });
  },
};
