/**
 * Central admin API guard — use instead of duplicate requireAnyAdmin in plugins.
 * Global middleware (Part 3) already enforces auth+RBAC; this attaches req.adminUser for handlers.
 */
const authFacade = require("../core/auth");
const { requirePermission: rbacRequirePermission } = require("./rbac");
const { assertSafeId } = require("./idorGuard");

function requireAnyAdmin(req, res) {
  const identity = authFacade.requireAuth(req, res, { realm: "admin" });
  return identity ? req.adminUser : null;
}

function requirePermission(req, res, permission) {
  if (!requireAnyAdmin(req, res)) return false;
  return authFacade.requirePermission(req, res, permission);
}

function requireRole(req, res, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const identity = authFacade.requireRole(req, res, allowed);
  return identity ? req.adminUser : null;
}

function guardResourceId(req, res, id, label = "id") {
  return assertSafeId(req, res, id, label);
}

module.exports = {
  requireAnyAdmin,
  requirePermission,
  requireRole,
  guardResourceId,
  authFacade,
};
