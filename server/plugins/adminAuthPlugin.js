const { login, logout, verifyTwoFactor, requireAuth, extractToken, listActiveSessions, revokeSession } = require("../lib/auth");
const { listAudit } = require("../lib/audit");
const { requirePermission } = require("../lib/rbac");
const adminTwoFactor = require("../lib/adminTwoFactor");
const { verifyPassword } = require("../lib/password");

function findAdminUser(email) {
  const users = require("../lib/auth").loadUsers();
  return users.find((entry) => entry.email.toLowerCase() === String(email || "").trim().toLowerCase());
}

module.exports = {
  register(app) {
    app.post("/api/admin/login", (req, res) => {
      const { email, password } = req.body || {};
      const result = login(email, password, req);
      if (!result.success) return res.status(result.errorKey === "admin.auth.rateLimited" ? 429 : 401).json(result);
      if (result.requires2FA) {
        return res.json(result);
      }
      return res.json(result);
    });

    app.post("/api/admin/login/2fa", (req, res) => {
      const { challengeToken, code } = req.body || {};
      const result = verifyTwoFactor(challengeToken, code, req);
      if (!result.success) return res.status(401).json(result);
      return res.json(result);
    });

    app.post("/api/admin/logout", (req, res) => {
      logout(extractToken(req), req);
      return res.json({ success: true });
    });

    app.get("/api/admin/me", (req, res) => {
      const session = requireAuth(req, res);
      if (!session) return;
      return res.json({
        success: true,
        user: {
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
        },
        twoFactor: adminTwoFactor.getStatus(session.email),
      });
    });

    app.get("/api/admin/security/2fa/status", (req, res) => {
      const session = requireAuth(req, res);
      if (!session) return;
      return res.json({ success: true, ...adminTwoFactor.getStatus(session.email) });
    });

    app.post("/api/admin/security/2fa/setup", (req, res) => {
      const session = requireAuth(req, res);
      if (!session) return;
      if (session.role !== "administrator") {
        return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      }
      const setup = adminTwoFactor.beginSetup(session.email);
      return res.json({ success: true, ...setup });
    });

    app.post("/api/admin/security/2fa/enable", (req, res) => {
      const session = requireAuth(req, res);
      if (!session) return;
      if (session.role !== "administrator") {
        return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      }
      const result = adminTwoFactor.completeSetup(session.email, req.body?.code);
      if (!result.ok) return res.status(400).json({ success: false, errorKey: result.errorKey });
      return res.json({ success: true, enabled: true });
    });

    app.post("/api/admin/security/2fa/disable", (req, res) => {
      const session = requireAuth(req, res);
      if (!session) return;
      if (session.role !== "administrator") {
        return res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
      }
      const user = findAdminUser(session.email);
      const password = req.body?.password;
      if (!user || !password || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ success: false, errorKey: "admin.auth.invalid" });
      }
      const result = adminTwoFactor.disable(session.email, req.body?.code);
      if (!result.ok) return res.status(400).json({ success: false, errorKey: result.errorKey });
      return res.json({ success: true, enabled: false });
    });

    app.get("/api/admin/audit", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "audit.read")) return;
      return res.json({ success: true, entries: listAudit(200) });
    });

    app.get("/api/admin/sessions", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "security.read")) return;
      const scopeAll = req.adminUser.role === "administrator" || req.adminUser.role === "super_admin";
      const sessions = listActiveSessions(scopeAll ? null : req.adminUser.userId);
      return res.json({ success: true, sessions });
    });

    app.delete("/api/admin/sessions/:sessionId", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "security.manage")) return;
      const { assertSafeId } = require("../lib/idorGuard");
      if (!assertSafeId(req, res, req.params.sessionId, "sessionId")) return;
      const targetSessions = listActiveSessions();
      const target = targetSessions.find((s) => s.sessionId === req.params.sessionId);
      if (target && target.userId !== req.adminUser.userId) {
        if (req.adminUser.role !== "administrator" && req.adminUser.role !== "super_admin") {
          return res.status(403).json({ success: false, errorKey: "security.accessDenied" });
        }
      }
      const ok = revokeSession(req.params.sessionId, { revokedBy: req.adminUser.email });
      if (!ok) return res.status(404).json({ success: false, errorKey: "security.sessionNotFound" });
      return res.json({ success: true });
    });
  },
};
