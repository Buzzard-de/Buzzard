/**
 * IDOR and privilege escalation guards.
 */
const { logSecurityEvent } = require("./securityLog");
const { getClientIp } = require("./security");
const { can } = require("./rbac");
const { isSafeId } = require("./security");

function deny(req, res, detail) {
  logSecurityEvent({
    type: "idor_attempt",
    success: false,
    ip: getClientIp(req),
    path: req.url,
    userId: req.adminUser?.userId,
    email: req.adminUser?.email,
    role: req.adminUser?.role,
    detail,
  });
  res.status(403).json({ success: false, errorKey: "security.accessDenied" });
  return false;
}

function assertSafeId(req, res, id, label = "id") {
  if (!isSafeId(String(id || ""))) {
    return deny(req, res, { reason: "invalid_id", label, id });
  }
  return true;
}

function assertAdminRole(req, res, targetRole) {
  const actorRole = req.adminUser?.role;
  if (!actorRole) return deny(req, res, { reason: "no_actor" });
  if (actorRole === "administrator" || actorRole === "super_admin") return true;
  if (targetRole === "administrator" || targetRole === "super_admin") {
    logSecurityEvent({
      type: "privilege_escalation_attempt",
      success: false,
      ip: getClientIp(req),
      path: req.url,
      userId: req.adminUser?.userId,
      email: req.adminUser?.email,
      role: actorRole,
      detail: { targetRole },
    });
    res.status(403).json({ success: false, errorKey: "security.privilegeEscalation" });
    return false;
  }
  return true;
}

function assertResourceAccess(req, res, { ownerId, permission, allowSameUser = true }) {
  if (!req.adminUser) return deny(req, res, { reason: "unauthenticated" });
  if (can(req.adminUser.role, "*")) return true;
  if (permission && !can(req.adminUser.role, permission)) {
    return deny(req, res, { reason: "missing_permission", permission });
  }
  if (allowSameUser && ownerId && String(ownerId) === String(req.adminUser.userId)) return true;
  if (ownerId && permission && can(req.adminUser.role, permission)) return true;
  return deny(req, res, { reason: "resource_forbidden", ownerId });
}

function assertNotSelfEscalation(req, res, targetUserId, newRole) {
  if (String(targetUserId) === String(req.adminUser?.userId) && newRole !== req.adminUser?.role) {
    logSecurityEvent({
      type: "privilege_escalation_attempt",
      success: false,
      ip: getClientIp(req),
      path: req.url,
      userId: req.adminUser?.userId,
      detail: { selfEscalation: true, newRole },
    });
    res.status(403).json({ success: false, errorKey: "security.selfEscalationDenied" });
    return false;
  }
  return true;
}

module.exports = {
  assertSafeId,
  assertAdminRole,
  assertResourceAccess,
  assertNotSelfEscalation,
  deny,
};
