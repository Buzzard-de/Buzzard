const PERMISSIONS = {
  administrator: ["*"],
  catalog_manager: [
    "products.read",
    "products.write",
    "suppliers.read",
    "sync.read",
    "sync.run",
    "imports.run",
    "audit.read",
  ],
  order_manager: [
    "orders.read",
    "orders.write",
    "logistics.read",
    "logistics.write",
    "products.read",
    "audit.read",
  ],
  read_only: [
    "products.read",
    "suppliers.read",
    "sync.read",
    "orders.read",
    "logistics.read",
    "audit.read",
  ],
};

function can(role, permission) {
  const allowed = PERMISSIONS[role] || [];
  if (allowed.includes("*")) return true;
  return allowed.includes(permission);
}

function requirePermission(req, res, permission) {
  if (!req.adminUser) return false;
  if (!can(req.adminUser.role, permission)) {
    res.status(403).json({ success: false, errorKey: "admin.auth.forbidden" });
    return false;
  }
  return true;
}

module.exports = { can, requirePermission, PERMISSIONS };
