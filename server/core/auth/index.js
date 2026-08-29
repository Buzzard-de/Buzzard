/**
 * Unified Authentication Facade — Part 3
 * Wraps legacy auth systems without removing them.
 */
const adminProvider = require("./providers/adminProvider");
const customerProvider = require("./providers/customerProvider");
const serviceProvider = require("./providers/serviceProvider");
const aiProvider = require("./providers/aiProvider");
const { can, requirePermission: rbacRequirePermission } = require("../../lib/rbac");
const { logSecurityEvent } = require("../../lib/securityLog");
const { getClientIp } = require("../../lib/security");

const PROVIDERS = {
  admin: adminProvider,
  customer: customerProvider,
  service: serviceProvider,
  ai: aiProvider,
};

function resolveRealmForPath(pathname) {
  if (pathname.startsWith("/api/admin/")) return "admin";
  if (pathname.startsWith("/api/account/") || pathname.startsWith("/api/customer/")) return "customer";
  if (pathname.startsWith("/api/identity-security/")) return "service";
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/db/")) return "service";
  if (pathname.startsWith("/api/ai/internal/")) return "ai";
  return null;
}

function attachIdentity(req, identity) {
  if (!identity) return;
  req.authIdentity = identity;
  if (identity.realm === "admin") {
    req.adminUser = {
      userId: identity.userId,
      id: identity.userId,
      email: identity.email,
      name: identity.name,
      role: identity.role,
    };
    req.adminToken = identity.token;
  }
  if (identity.realm === "customer") {
    req.customerUser = identity.session;
    req.customerToken = identity.token;
  }
  if (identity.realm === "service") {
    req.user = identity.session;
    req.serviceToken = identity.token;
  }
  if (identity.realm === "ai") {
    req.aiEmployee = identity.employee;
  }
}

function authenticate(req, { realm } = {}) {
  const targetRealm = realm || resolveRealmForPath(req.url || "");
  if (!targetRealm) return null;
  const provider = PROVIDERS[targetRealm];
  if (!provider) return null;
  const identity = provider.authenticate(req);
  if (identity) attachIdentity(req, identity);
  return identity;
}

function getCurrentUser(req) {
  if (req.authIdentity) return req.authIdentity;
  for (const name of ["admin", "customer", "service", "ai"]) {
    const identity = PROVIDERS[name].authenticate(req);
    if (identity) {
      attachIdentity(req, identity);
      return identity;
    }
  }
  return null;
}

function getSession(req, realm = "admin") {
  const provider = PROVIDERS[realm];
  if (!provider?.extractToken || !provider?.getSession) {
    const identity = authenticate(req, { realm });
    return identity?.session || null;
  }
  const token = provider.extractToken(req);
  return provider.getSession(token);
}

function requireAuth(req, res, { realm = "admin" } = {}) {
  if (req.adminUser && realm === "admin") {
    return req.adminUser;
  }
  const identity = authenticate(req, { realm });
  if (identity) return identity;
  logSecurityEvent({
    type: realm === "admin" ? "admin_auth_required" : `${realm}_auth_required`,
    success: false,
    ip: getClientIp(req),
    path: req.url,
  });
  res.status(401).json({ success: false, errorKey: "admin.auth.required" });
  return null;
}

function requireRole(req, res, allowedRoles) {
  const identity = getCurrentUser(req) || requireAuth(req, res);
  if (!identity) return null;
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const role = identity.role || req.adminUser?.role;
  if (!roles.includes(role) && role !== "administrator" && role !== "super_admin") {
    logSecurityEvent({
      type: "privilege_escalation_attempt",
      success: false,
      ip: getClientIp(req),
      path: req.url,
      userId: identity.userId,
      email: identity.email,
      role,
      detail: { requiredRoles: roles },
    });
    res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
    return null;
  }
  return identity;
}

function requirePermission(req, res, permission) {
  if (!req.adminUser) {
    const auth = requireAuth(req, res, { realm: "admin" });
    if (!auth) return false;
  }
  if (!rbacRequirePermission(req, res, permission)) {
    logSecurityEvent({
      type: "permission_denied",
      success: false,
      ip: getClientIp(req),
      path: req.url,
      userId: req.adminUser?.userId,
      email: req.adminUser?.email,
      role: req.adminUser?.role,
      detail: { permission },
    });
    return false;
  }
  return true;
}

function logout(req, realm = "admin") {
  const provider = PROVIDERS[realm];
  if (!provider?.extractToken || !provider?.logout) return false;
  const token = provider.extractToken(req);
  provider.logout(token, req);
  return true;
}

function refreshSession(req, res) {
  res.status(501).json({ success: false, errorKey: "auth.refreshNotSupported", message: "Use identity-security refresh for JWT sessions" });
  return null;
}

function verifyMFA(req, res, { code, challengeToken } = {}) {
  const legacyAuth = require("../../lib/auth");
  if (challengeToken && code) {
    return legacyAuth.verifyTwoFactor(challengeToken, code, req);
  }
  res.status(400).json({ success: false, errorKey: "admin.2fa.required" });
  return null;
}

module.exports = {
  PROVIDERS,
  resolveRealmForPath,
  authenticate,
  getCurrentUser,
  getSession,
  requireAuth,
  requireRole,
  requirePermission,
  logout,
  refreshSession,
  verifyMFA,
  attachIdentity,
  can,
};
