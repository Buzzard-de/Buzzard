/**
 * Global auth + RBAC middleware wrapper for all registered routes.
 */
const authFacade = require("../core/auth");
const { resolveRoutePermission } = require("./routePermissions");
const { validateCsrfForRequest } = require("./csrf");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FAIL_CLOSED_GET_PREFIXES = [
  "/api/p1/",
  "/api/guardian/",
  "/api/orchestrator/",
  "/api/db/",
  "/api/debug/",
  "/api/internal/",
];

function isFailClosedGet(pathname) {
  const path = String(pathname || "");
  return FAIL_CLOSED_GET_PREFIXES.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix));
}

function wrapRouteHandler(method, routePath, handler) {
  const policy = resolveRoutePermission(method, routePath);
  const upper = String(method || "GET").toUpperCase();

  if (!policy) {
    if (WRITE_METHODS.has(upper) || (upper === "GET" && isFailClosedGet(routePath))) {
      return function failClosedMissingPolicy(req, res) {
        res.status(401).json({ success: false, errorKey: "admin.auth.required" });
      };
    }
    return handler;
  }

  return function guardedHandler(req, res) {
    if (policy.public) {
      return handler(req, res);
    }

    if (!validateCsrfForRequest(req, res)) {
      return;
    }

    const realm = policy.realm || "admin";
    const identity = authFacade.requireAuth(req, res, { realm });
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
