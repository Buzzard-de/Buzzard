/**
 * Central nav slug → permission mapping (Part 4).
 * Used by AdminShell (frontend filter) and verify scripts.
 */

export const NAV_SLUG_PERMISSIONS = {
  "": "system.read",
  "control-center": "system.read",
  "analytics-dashboard": "analytics.read",
  "master-admin-v40": "system.read",
  products: "products.read",
  catalog: "products.read",
  "pim-catalog": "products.read",
  "product-catalog-pim": "products.read",
  seo: "seo.read",
  orders: "orders.read",
  "order-management": "orders.read",
  "order-management-v32": "orders.read",
  "cart-checkout": "orders.read",
  "customer-checkout": "orders.read",
  "returns-rma": "orders.read",
  "payments-finance": "orders.read",
  "payments-v36": "orders.read",
  "marketing-center": "analytics.read",
  "marketing-loyalty": "analytics.read",
  "reviews-ratings": "analytics.read",
  "marketplace-hub": "analytics.read",
  "marketplace-v35": "analytics.read",
  "crm-customer-service": "orders.read",
  "crm-loyalty": "orders.read",
  "customer-support": "orders.read",
  "contact-submissions": "audit.read",
  logistics: "logistics.read",
  "logistics-fulfillment": "logistics.read",
  "fulfillment-v33": "logistics.read",
  "logistics-v34": "logistics.read",
  "wms-inventory": "logistics.read",
  suppliers: "suppliers.read",
  "supplier-hub": "suppliers.read",
  "supplier-integration-hub": "suppliers.read",
  sync: "sync.read",
  integrations: "integrations.read",
  analytics: "analytics.read",
  "analytics-v39": "analytics.read",
  "identity-security": "security.read",
  "security-dashboard": "security.read",
  "security-v38": "security.read",
  "international-v37": "products.read",
  "ai-center": "ai.read",
  "advanced-search": "products.read",
  localization: "products.read",
  automation: "automation.read",
  sessions: "security.read",
};

/** Client-side permission check mirroring server/lib/rbac.js */
const PERMISSIONS = {
  administrator: ["*"],
  super_admin: ["*"],
  admin: [
    "users.read", "users.write", "categories.read", "categories.write", "categories.publish",
    "products.read", "products.write", "orders.read", "orders.write",
    "ai.read", "ai.assign", "ai.execute", "system.read", "system.configure",
    "security.read", "security.manage", "audit.read", "integrations.read", "integrations.manage",
    "suppliers.read", "sync.read", "sync.run", "imports.run", "analytics.read", "analytics.export",
    "seo.read", "seo.write", "logistics.read", "logistics.write", "automation.read", "automation.run",
  ],
  catalog_manager: [
    "products.read", "products.write", "categories.read", "categories.write", "categories.publish",
    "suppliers.read", "sync.read", "sync.run", "imports.run", "audit.read", "analytics.read",
    "analytics.export", "seo.read", "seo.write", "automation.read", "ai.read",
  ],
  order_manager: [
    "orders.read", "orders.write", "logistics.read", "logistics.write", "products.read",
    "audit.read", "analytics.read", "analytics.export", "automation.read", "automation.run", "ai.read",
  ],
  staff: [
    "products.read", "categories.read", "orders.read", "ai.read", "audit.read", "system.read",
  ],
  read_only: [
    "products.read", "suppliers.read", "sync.read", "orders.read", "logistics.read",
    "categories.read", "audit.read", "analytics.read", "automation.read", "ai.read",
    "system.read", "security.read", "integrations.read", "seo.read",
  ],
  ai_agent: ["ai.read", "ai.execute"],
};

export function canAccess(role, permission) {
  const normalized = role === "administrator" ? "super_admin" : role;
  const allowed = PERMISSIONS[normalized] || PERMISSIONS[role] || [];
  if (allowed.includes("*")) return true;
  return allowed.includes(permission);
}

export function canAccessNavSlug(role, slug) {
  const permission = NAV_SLUG_PERMISSIONS[slug];
  if (!permission) return role === "administrator" || role === "super_admin" || role === "admin";
  return canAccess(role, permission);
}

export function filterNavGroupsForRole(groups, role) {
  if (!role) return [];
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavSlug(role, item.slug)),
    }))
    .filter((group) => group.items.length > 0);
}
