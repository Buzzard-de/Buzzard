/**
 * Central route → permission map for global RBAC (Part 3).
 * Unlisted /api/admin/* routes use derivePermission() heuristics.
 */

const PUBLIC_ROUTES = new Set([
  "POST /api/admin/login",
  "POST /api/admin/login/2fa",
  "POST /api/admin/logout",
  "GET /api/health",
  "GET /api/health/db",
  "GET /api/health/ai",
  "GET /api/status",
  "GET /api/categories/visibility",
  "GET /api/catalog/health",
  "GET /api/storefront/health",
  "GET /api/health/commerce",
  "GET /api/health/version",
  "GET /api/health/worker",
  "GET /api/health/production",
  "GET /api/health/go-live-readiness",
  "GET /api/health/operations",
  "GET /api/health/storefront-readiness",
  "GET /api/health/customer-experience-readiness",
  "GET /api/health/admin-backoffice-readiness",
  "GET /api/health/security-readiness",
  "GET /api/health/product-quality-readiness",
  "GET /api/health/supplier-readiness",
  "GET /api/health/release-readiness",
  "GET /api/health/final-production-readiness",
  "GET /api/commerce/status",
  "GET /api/commerce/readiness",
  "GET /api/commerce/shipping/methods",
  "GET /api/security/health",
  "GET /api/p1/status",
  "GET /api/orchestrator/status",
  "GET /api/guardian/status",
]);

const EXACT = {
  "GET /api/admin/me": null,
  "GET /api/admin/sessions": "security.read",
  "DELETE /api/admin/sessions/:sessionId": "security.manage",
  "GET /api/admin/audit": "audit.read",
  "GET /api/admin/control-center/deployment": "system.read",
  "GET /api/admin/operations/summary": "system.read",
  "GET /api/admin/operations/audit": "audit.read",
  "GET /api/admin/operations/go-live-readiness": "system.read",
  "GET /api/admin/operations/readiness": "system.read",
  "GET /api/admin/operations/dashboard": "system.read",
  "GET /api/admin/operations/incidents": "system.read",
  "GET /api/admin/control-center/status": "system.read",
  "GET /api/admin/control-center/summary": "system.read",
  "GET /api/admin/control-center/activity": "audit.read",
  "GET /api/admin/control-center/search": "system.read",
  "GET /api/admin/control-center/security": "security.read",
  "GET /api/admin/control-center/config": "system.read",
  "PUT /api/admin/control-center/config/:key": "system.configure",
  "GET /api/admin/control-center/integrations": "integrations.read",
  "GET /api/admin/control-center/escalations": "security.read",
  "GET /api/admin/control-center/background-jobs": "system.read",
  "GET /api/admin/control-center/jobs": "system.read",
  "POST /api/admin/control-center/jobs": "system.configure",
  "GET /api/admin/automation/overview": "system.read",
  "GET /api/admin/automation/worker": "system.read",
  "POST /api/admin/automation/worker/:action": "system.configure",
  "GET /api/admin/automation/jobs": "system.read",
  "GET /api/admin/automation/jobs/:id": "system.read",
  "POST /api/admin/automation/jobs/:id/retry": "system.configure",
  "POST /api/admin/automation/jobs/:id/cancel": "system.configure",
  "POST /api/admin/automation/jobs": "system.configure",
  "GET /api/admin/automation/schedules": "system.read",
  "POST /api/admin/automation/schedules": "system.configure",
  "DELETE /api/admin/automation/schedules/:id": "system.configure",
  "GET /api/admin/automation/integrations/health": "integrations.read",
  "GET /api/admin/automation/suppliers": "suppliers.read",
  "POST /api/admin/automation/sync/:kind": "sync.run",
  "GET /api/admin/automation/readiness/:categoryId": "categories.read",
  "GET /api/admin/control-center/notifications": "system.read",
  "GET /api/admin/ai/employees": "ai.read",
  "PATCH /api/admin/ai/employees/:id/status": "ai.assign",
  "GET /api/admin/ai/tasks": "ai.read",
  "POST /api/admin/ai/tasks": "ai.assign",
  "PATCH /api/admin/ai/tasks/:id/status": "ai.execute",
  "GET /api/admin/approvals": "ai.read",
  "POST /api/admin/approvals": "ai.assign",
  "POST /api/admin/approvals/:id/decide": "ai.execute",
  "GET /api/admin/categories/visibility": "categories.read",
  "PATCH /api/admin/categories/:categoryId/visibility": "categories.write",
  "GET /api/admin/security/events": "security.read",
  "GET /api/admin/security/readiness": "security.read",
  "GET /api/admin/security/audit": "security.read",
  "GET /api/admin/monitoring/readiness": "system.read",
  "GET /api/admin/catalog/product-quality": "products.read",
  "POST /api/admin/catalog/product-quality/evaluate": "products.read",
  "GET /api/admin/suppliers/readiness": "suppliers.read",
  "GET /api/admin/suppliers/:id/health": "suppliers.read",
  "GET /api/admin/suppliers/:id/capabilities": "suppliers.read",
  "POST /api/admin/suppliers/:id/validate": "suppliers.read",
  "POST /api/admin/suppliers/:id/dry-run": "suppliers.read",
  "GET /api/admin/release/readiness": "system.read",
  "GET /api/admin/release/manifest": "system.read",
  "GET /api/admin/release/rollback": "system.read",
  "POST /api/admin/release/validate": "system.read",
  "GET /api/admin/release/final-readiness": "system.read",
  "GET /api/admin/release/final-hardening": "system.read",
  "GET /api/admin/release/final-audit": "audit.read",
  "POST /api/admin/release/final-validate": "system.read",
  "GET /api/admin/identity-security/overview": "security.read",
  "GET /api/admin/identity-security/audit": "audit.read",
  "GET /api/admin/identity-security/sessions": "security.read",
};

const PREFIX = [
  { prefix: "/api/admin/products", read: "products.read", write: "products.write" },
  { prefix: "/api/admin/catalog", read: "products.read", write: "products.write" },
  { prefix: "/api/admin/pim", read: "products.read", write: "products.write" },
  { prefix: "/api/admin/storefront", read: "products.read", write: "sync.run" },
  { prefix: "/api/admin/commerce", read: "system.read", write: "system.configure" },
  { prefix: "/api/admin/orders", read: "orders.read", write: "orders.write" },
  { prefix: "/api/admin/order", read: "orders.read", write: "orders.write" },
  { prefix: "/api/admin/suppliers", read: "suppliers.read", write: "suppliers.write" },
  { prefix: "/api/admin/supplier", read: "suppliers.read", write: "suppliers.write" },
  { prefix: "/api/admin/sync", read: "sync.read", write: "sync.run" },
  { prefix: "/api/admin/import", read: "imports.run", write: "imports.run" },
  { prefix: "/api/admin/seo", read: "seo.read", write: "seo.write" },
  { prefix: "/api/admin/analytics", read: "analytics.read", write: "analytics.export" },
  { prefix: "/api/admin/logistics", read: "logistics.read", write: "logistics.write" },
  { prefix: "/api/admin/integrations", read: "integrations.read", write: "integrations.manage" },
  { prefix: "/api/admin/payments", read: "orders.read", write: "orders.write" },
  { prefix: "/api/admin/crm", read: "orders.read", write: "orders.write" },
  { prefix: "/api/admin/marketing", read: "analytics.read", write: "analytics.export" },
  { prefix: "/api/admin/wms", read: "logistics.read", write: "logistics.write" },
  { prefix: "/api/admin/ai-center", read: "ai.read", write: "ai.assign" },
  { prefix: "/api/admin/automation", read: "automation.read", write: "automation.run" },
  { prefix: "/api/admin/guardian", read: "security.read", write: "security.manage" },
  { prefix: "/api/admin/p1", read: "system.read", write: "system.configure" },
  { prefix: "/api/admin/submissions", read: "audit.read", write: "audit.read" },
  { prefix: "/api/security/admin", read: "security.read", write: "security.manage" },
];

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function routeKey(method, pathname) {
  return `${method.toUpperCase()} ${pathname}`;
}

function normalizePattern(pathname) {
  return pathname
    .split("/")
    .map((seg) => (seg && !seg.startsWith(":") && /^[a-z0-9_-]{1,64}$/i.test(seg) ? seg : ":param"))
    .join("/");
}

function resolveRoutePermission(method, pathname) {
  const upper = method.toUpperCase();
  const key = routeKey(upper, pathname);
  if (PUBLIC_ROUTES.has(key)) return { public: true };

  for (const [pattern, permission] of Object.entries(EXACT)) {
    const [patMethod, ...patParts] = pattern.split(" ");
    const patPath = patParts.join(" ");
    if (patMethod !== upper) continue;
    const patSegs = patPath.split("/").filter(Boolean);
    const reqSegs = pathname.split("/").filter(Boolean);
    if (patSegs.length !== reqSegs.length) continue;
    let match = true;
    for (let i = 0; i < patSegs.length; i++) {
      if (patSegs[i].startsWith(":")) continue;
      if (patSegs[i] !== reqSegs[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      if (permission === null) return { authenticated: true };
      return { permission };
    }
  }

  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/security/admin")) {
    for (const entry of PREFIX) {
      if (pathname.startsWith(entry.prefix)) {
        const permission = WRITE_METHODS.has(upper) ? entry.write : entry.read;
        return { permission };
      }
    }
    if (WRITE_METHODS.has(upper)) {
      return { permission: "system.configure", derived: true };
    }
    return {
      authenticated: true,
      derived: true,
    };
  }

  return null;
}

module.exports = {
  PUBLIC_ROUTES,
  EXACT,
  PREFIX,
  resolveRoutePermission,
  routeKey,
};
