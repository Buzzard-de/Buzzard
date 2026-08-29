const PERMISSIONS = {
  administrator: ["*"],
  super_admin: ["*"],
  admin: [
    "users.read",
    "users.write",
    "categories.read",
    "categories.write",
    "categories.publish",
    "products.read",
    "products.write",
    "orders.read",
    "orders.write",
    "ai.read",
    "ai.assign",
    "ai.execute",
    "system.read",
    "system.configure",
    "security.read",
    "security.manage",
    "audit.read",
    "integrations.read",
    "integrations.manage",
  ],
  catalog_manager: [
    "products.read",
    "products.write",
    "categories.read",
    "categories.write",
    "categories.publish",
    "suppliers.read",
    "sync.read",
    "sync.run",
    "imports.run",
    "audit.read",
    "analytics.read",
    "analytics.export",
    "seo.read",
    "seo.write",
    "automation.read",
    "ai.read",
  ],
  order_manager: [
    "orders.read",
    "orders.write",
    "logistics.read",
    "logistics.write",
    "products.read",
    "audit.read",
    "analytics.read",
    "analytics.export",
    "automation.read",
    "automation.run",
    "ai.read",
  ],
  staff: [
    "products.read",
    "categories.read",
    "orders.read",
    "ai.read",
    "audit.read",
    "system.read",
  ],
  ai_agent: ["ai.read", "ai.execute"],
  read_only: [
    "products.read",
    "suppliers.read",
    "sync.read",
    "orders.read",
    "logistics.read",
    "categories.read",
    "audit.read",
    "analytics.read",
    "automation.read",
    "ai.read",
    "system.read",
    "security.read",
  ],
};

function can(role, permission) {
  const normalized = role === "administrator" ? "super_admin" : role;
  const allowed = PERMISSIONS[normalized] || PERMISSIONS[role] || [];
  if (allowed.includes("*")) return true;
  return allowed.includes(permission);
}

function aiCanExecute(employeePermissions, requiredPermission) {
  if (!requiredPermission) return true;
  if (!Array.isArray(employeePermissions)) return false;
  if (employeePermissions.includes("*")) return true;
  return employeePermissions.includes(requiredPermission);
}

function requirePermission(req, res, permission) {
  if (!req.adminUser) return false;
  if (!can(req.adminUser.role, permission)) {
    res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
    return false;
  }
  return true;
}

module.exports = { can, requirePermission, PERMISSIONS, aiCanExecute };
