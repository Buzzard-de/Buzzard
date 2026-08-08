const { login, logout, requireAuth, extractToken } = require("../lib/auth");
const { listAudit } = require("../lib/audit");
const { requirePermission } = require("../lib/rbac");

module.exports = {
  register(app) {
    app.post("/api/admin/login", (req, res) => {
      const { email, password } = req.body || {};
      const result = login(email, password);
      if (!result.success) return res.status(401).json(result);
      return res.json(result);
    });

    app.post("/api/admin/logout", (req, res) => {
      logout(extractToken(req));
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
      });
    });

    app.get("/api/admin/audit", (req, res) => {
      if (!requireAuth(req, res)) return;
      if (!requirePermission(req, res, "audit.read")) return;
      return res.json({ success: true, entries: listAudit(200) });
    });
  },
};
