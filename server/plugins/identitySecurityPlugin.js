const { extractToken, verifyToken } = require("../lib/dbAuth");
const { extractToken: extractAdminToken, getSession } = require("../lib/auth");
const identitySecurity = require("../lib/identitySecurity");

function requireAnyAdmin(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      const user = verifyToken(bearer);
      if (user.role === "admin") {
        req.user = user;
        return user;
      }
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    return session;
  }

  res.status(403).json({ error: "Admin access required" });
  return null;
}

function requireIdentityAuth(req, res) {
  const bearer = extractToken(req);
  if (bearer) {
    try {
      req.user = verifyToken(bearer);
      return req.user;
    } catch {
      /* fall through */
    }
  }

  const adminToken = extractAdminToken(req);
  const session = getSession(adminToken);
  if (session) {
    req.adminUser = session;
    req.user = { sub: session.id, email: session.email, role: session.role };
    return req.user;
  }

  res.status(401).json({ error: "Authentication required" });
  return null;
}

module.exports = {
  register(app) {
    if (!identitySecurity.isEnabled()) {
      console.log("Identity security disabled (BUZZARD_IDENTITY_SECURITY=0 or BUZZARD_DB_ENABLED=0)");
      return;
    }

    app.post("/api/identity-security/auth/register", (req, res) => {
      const result = identitySecurity.registerUser(req.body || {}, req);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json({ ok: true, userId: result.userId, verificationTokenForDevelopment: result.verificationTokenForDevelopment });
    });

    app.post("/api/identity-security/auth/verify-email", (req, res) => {
      const result = identitySecurity.verifyEmail(req.body || {}, req);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/identity-security/auth/login", (req, res) => {
      const result = identitySecurity.loginUser(req.body || {}, req);
      if (result.error) return res.status(result.status || 401).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/identity-security/auth/refresh", (req, res) => {
      const result = identitySecurity.refreshAccessToken(req.body || {});
      if (result.error) return res.status(result.status || 401).json({ error: result.error });
      return res.json(result);
    });

    app.post("/api/identity-security/auth/logout", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      const result = identitySecurity.logoutUser(user.sub, req.body || {}, req);
      return res.json(result);
    });

    app.post("/api/identity-security/auth/password-reset-request", (req, res) => {
      const result = identitySecurity.requestPasswordReset(req.body || {}, req);
      return res.json(result);
    });

    app.post("/api/identity-security/auth/password-reset", (req, res) => {
      const result = identitySecurity.completePasswordReset(req.body || {}, req);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.json(result);
    });

    app.get("/api/identity-security/account", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      const result = identitySecurity.getAccount(user.sub);
      if (result.error) return res.status(result.status || 404).json({ error: result.error });
      return res.json(result.account);
    });

    app.patch("/api/identity-security/account", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      const result = identitySecurity.updateAccount(user.sub, req.body || {}, req);
      return res.json(result);
    });

    app.get("/api/identity-security/account/addresses", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      return res.json(identitySecurity.listAddresses(user.sub));
    });

    app.post("/api/identity-security/account/addresses", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      const result = identitySecurity.createAddress(user.sub, req.body || {});
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.address);
    });

    app.delete("/api/identity-security/account/addresses/:id", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      return res.json(identitySecurity.deleteAddress(user.sub, req.params.id));
    });

    app.post("/api/identity-security/account/2fa/setup", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      return res.json(identitySecurity.setupTwoFactor(user.sub, req));
    });

    app.post("/api/identity-security/account/2fa/disable", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      return res.json(identitySecurity.disableTwoFactor(user.sub, req));
    });

    app.post("/api/identity-security/privacy/request", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      const result = identitySecurity.createPrivacyRequest(user.sub, req.body || {}, req);
      if (result.error) return res.status(result.status || 400).json({ error: result.error });
      return res.status(201).json(result.request);
    });

    app.get("/api/identity-security/privacy/requests", (req, res) => {
      const user = requireIdentityAuth(req, res);
      if (!user) return;
      return res.json(identitySecurity.listPrivacyRequests(user.sub));
    });

    app.get("/api/admin/identity-security/overview", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(identitySecurity.getSecurityOverview());
    });

    app.get("/api/admin/identity-security/audit", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(identitySecurity.listSecurityAudit());
    });

    app.get("/api/admin/identity-security/sessions", (req, res) => {
      if (!requireAnyAdmin(req, res)) return;
      return res.json(identitySecurity.listSessions());
    });
  },
};
