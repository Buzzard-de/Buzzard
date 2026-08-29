/**
 * Global auth + RBAC middleware wrapper for all registered routes.
 */
const authFacade = require("../core/auth");
const { resolveRoutePermission } = require("./routePermissions");
const { validateCsrfForRequest } = require("./csrf");

function wrapRouteHandler(method, routePath, handler) {
  const policy = resolveRoutePermission(method, routePath);
  if (!policy) return handler;

  return function guardedHandler(req, res) {
    if (policy.public) {
      return handler(req, res);
    }

    if (!validateCsrfForRequest(req, res)) {
      return;
    }

    const identity = authFacade.requireAuth(req, res, { realm: "admin" });
    if (!identity) return;

    if (policy.permission && !authFacade.requirePermission(req, res, policy.permission)) {
      return;
    }

    return handler(req, res);
  };
}

function requireAnyAdmin(req, res) {
  const identity = authFacade.requireAuth(req, res, { realm: "admin" });
  return identity ? req.adminUser : null;
}

module.exports = {
  wrapRouteHandler,
  requireAnyAdmin,
};
