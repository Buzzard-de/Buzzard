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
  "GET /api/health/part27-readiness",
  "GET /api/health/final-go-live-readiness",
  "GET /api/health/final-prelaunch-readiness",
  "GET /api/health/final-operational-readiness",
  "GET /api/health/final-launch-governance",
  "GET /api/health/final-control-recovery",
  "GET /api/health/final-prelaunch-control",
  "GET /api/health/final-launch-control",
  "GET /api/health/final-production-governance",
  "GET /api/commerce/status",
  "GET /api/commerce/readiness",
  "GET /api/commerce/shipping/methods",
  "GET /api/security/health",
  "GET /api/p1/status",
]);

const EXACT = {
  "GET /api/admin/me": null,
  "GET /api/admin/sessions": "security.read",
  "DELETE /api/admin/sessions/:sessionId": "security.manage",
  "GET /api/admin/audit": "audit.read",
  "POST /api/admin/account/password": null,
  "GET /api/admin/users": "users.read",
  "PATCH /api/admin/users/:userId/role": "users.write",
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
  "GET /api/admin/security/stores": "security.read",
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
  "GET /api/admin/operations/part27-readiness": "system.read",
  "GET /api/admin/operations/part27-audit": "audit.read",
  "POST /api/admin/operations/part27-validate": "system.read",
  "GET /api/admin/release/final-go-live": "system.read",
  "GET /api/admin/release/final-go-live/audit": "system.read",
  "POST /api/admin/release/final-go-live/validate": "system.read",
  "GET /api/admin/release/final-prelaunch": "system.read",
  "GET /api/admin/release/final-prelaunch/audit": "system.read",
  "POST /api/admin/release/final-prelaunch/validate": "system.read",
  "GET /api/admin/release/final-operational-readiness": "system.read",
  "GET /api/admin/release/final-operational-readiness/audit": "system.read",
  "POST /api/admin/release/final-operational-readiness/validate": "system.read",
  "GET /api/admin/release/final-launch-governance": "system.read",
  "GET /api/admin/release/final-launch-governance/audit": "system.read",
  "POST /api/admin/release/final-launch-governance/validate": "system.read",
  "GET /api/admin/release/final-control-recovery": "system.read",
  "GET /api/admin/release/final-control-recovery/audit": "system.read",
  "POST /api/admin/release/final-control-recovery/validate": "system.read",
  "GET /api/admin/release/final-prelaunch-control": "system.read",
  "GET /api/admin/release/final-prelaunch-control/audit": "system.read",
  "POST /api/admin/release/final-prelaunch-control/validate": "system.read",
  "GET /api/admin/release/final-launch-control": "system.read",
  "GET /api/admin/release/final-launch-control/audit": "system.read",
  "POST /api/admin/release/final-launch-control/validate": "system.read",
  "GET /api/admin/release/final-production-governance": "system.read",
  "GET /api/admin/release/final-production-governance/audit": "system.read",
  "POST /api/admin/release/final-production-governance/validate": "system.read",
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

/**
 * Back-office modules mounted outside /api/admin/. The admin UI is their only
 * caller and already sends the admin bearer; without an entry here the routes
 * are reachable without any session. Read permissions match the ones that
 * show the module in the admin navigation (lib/admin/navPermissions.mjs).
 */
const ADMIN_MODULE_PREFIX = [
  { prefix: "/api/master-admin-v40/", read: "system.read", write: "system.configure" },
  { prefix: "/api/security-v38/", read: "security.read", write: "security.manage" },
  { prefix: "/api/payments-v36/", read: "orders.read", write: "orders.write" },
  { prefix: "/api/order-management-v32/", read: "orders.read", write: "orders.write" },
  { prefix: "/api/marketplace-v35/", read: "analytics.read", write: "integrations.manage" },
  { prefix: "/api/logistics-v34/", read: "logistics.read", write: "logistics.write" },
  { prefix: "/api/fulfillment-v33/", read: "logistics.read", write: "logistics.write" },
  { prefix: "/api/international-v37/", read: "products.read", write: "system.configure" },
  { prefix: "/api/analytics-v39/", read: "analytics.read", write: "analytics.export" },
  { prefix: "/api/product-catalog-pim/", read: "products.read", write: "products.write" },
  { prefix: "/api/supplier-integration-hub/", read: "suppliers.read", write: "suppliers.write" },
];

/** Back-office operations on otherwise customer-facing prefixes. */
const ADMIN_OPERATIONS = {
  "POST /api/payments-finance/intents": "orders.write",
  "POST /api/payments-finance/intents/:id/confirm": "orders.write",
  "POST /api/payments-finance/intents/:id/refunds": "orders.write",
  "POST /api/payments-finance/invoices": "orders.write",
  "GET /api/marketing-loyalty/campaigns": "analytics.read",
  "POST /api/marketing-loyalty/campaigns": "analytics.export",
  "POST /api/marketing-loyalty/points": "orders.write",
  "POST /api/suppliers/import": "imports.run",
  "POST /api/dropship/forward": "orders.write",
  "POST /api/shipping/label": "logistics.write",
  "POST /api/vehicles/seed": "products.write",
  "POST /api/tecdoc/compatibility/link": "products.write",
  "POST /api/automation/order-created": "automation.run",
};
Object.assign(EXACT, ADMIN_OPERATIONS);

/**
 * Customer, order and loyalty records kept by back-office modules. The ids are
 * sequential, so without a session anyone could read or change another
 * customer's data by counting. No storefront page calls these routes; the
 * admin UI is their only client. Listed after ADMIN_OPERATIONS so that the
 * more specific campaign routes there match first.
 */
const BACK_OFFICE_RECORDS = {
  "POST /api/crm-customer-service/customers": "orders.write",
  "GET /api/crm-customer-service/customers/:id": "orders.read",
  "POST /api/crm-customer-service/tickets": "orders.write",
  "GET /api/crm-customer-service/tickets/:number": "orders.read",
  "POST /api/order-management/orders": "orders.write",
  "GET /api/order-management/orders/:orderNumber": "orders.read",
  "GET /api/order-management/customer/:customerId/orders": "orders.read",
  "GET /api/returns-rma/returns/:rmaNumber": "orders.read",
  "POST /api/marketing-loyalty/campaigns/:code/use": "orders.write",
  "POST /api/marketing-loyalty/accounts": "orders.write",
  "POST /api/marketing-loyalty/referrals/create": "orders.write",
  "POST /api/marketing-loyalty/referrals/complete": "orders.write",
  "PUT /api/marketing-loyalty/preferences/:customerId": "orders.write",
  "GET /api/marketing-loyalty/preferences/:customerId": "orders.read",
  "GET /api/marketing-loyalty/:customerId": "orders.read",
  // Barcode lookup returns stock and bin locations; it accepted any signed-in customer.
  "POST /api/wms-inventory/scan": "logistics.read",
};
Object.assign(EXACT, BACK_OFFICE_RECORDS);

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

/**
 * AI Center. A back-office tool: the storefront assistant lives under /api/ai/*.
 * Starting a conversation or a held AI job needs ai.execute; putting a job back
 * in the queue is a supervisor action (ai.assign).
 */
const AI_CENTER_ROUTES = {
  "POST /api/ai-center/sessions": "ai.execute",
  "GET /api/ai-center/sessions/:token": "ai.read",
  "POST /api/ai-center/chat": "ai.execute",
  "POST /api/ai-center/recommend": "ai.execute",
  "POST /api/ai-center/product-copy": "ai.execute",
  "POST /api/ai-center/translate": "ai.execute",
  "POST /api/ai-center/review-sentiment": "ai.execute",
  "POST /api/ai-center/smart-search": "ai.execute",
  "POST /api/ai-center/jobs/:id/retry": "ai.assign",
};
Object.assign(EXACT, AI_CENTER_ROUTES);

/**
 * Inbound webhooks. No user session exists for them; each request is admitted
 * by signature, timestamp and replay check (lib/webhookGate.js) with the
 * secret of its scope.
 */
const WEBHOOK_ROUTES = {
  "POST /api/payments-finance/webhook": "payment",
  "POST /api/webhooks/payment": "payment",
  "POST /api/payments-finance/provider/payout-webhook": "payout",
  "POST /api/payments-finance/provider/dispute-webhook": "dispute",
  "POST /api/marketplace-hub/order-webhook": "marketplace",
  "POST /api/logistics-fulfillment/carrier/webhook": "carrier",
  "POST /api/commerce/webhooks/:provider": "commerce",
  "POST /api/webhooks/:provider": "provider",
};

function matchesPattern(pattern, upper, pathname) {
  const [patMethod, ...patParts] = pattern.split(" ");
  if (patMethod !== upper) return false;
  const patSegs = patParts.join(" ").split("/").filter(Boolean);
  const reqSegs = pathname.split("/").filter(Boolean);
  if (patSegs.length !== reqSegs.length) return false;
  return patSegs.every((seg, i) => seg.startsWith(":") || seg === reqSegs[i]);
}

function resolveWebhookScope(upper, pathname) {
  const key = routeKey(upper, pathname);
  // The literal route wins over a parameterised one (/api/webhooks/payment vs /api/webhooks/:provider).
  if (Object.prototype.hasOwnProperty.call(WEBHOOK_ROUTES, key)) return WEBHOOK_ROUTES[key];
  for (const [pattern, scope] of Object.entries(WEBHOOK_ROUTES)) {
    if (matchesPattern(pattern, upper, pathname)) return scope;
  }
  return null;
}

function resolveRoutePermission(method, pathname) {
  const upper = method.toUpperCase();
  const key = routeKey(upper, pathname);
  if (PUBLIC_ROUTES.has(key)) return { public: true };

  const webhookScope = resolveWebhookScope(upper, pathname);
  if (webhookScope) return { webhook: webhookScope };

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

  for (const entry of ADMIN_MODULE_PREFIX) {
    if (pathname.startsWith(entry.prefix)) {
      return { permission: WRITE_METHODS.has(upper) ? entry.write : entry.read };
    }
  }

  return null;
}

module.exports = {
  PUBLIC_ROUTES,
  EXACT,
  PREFIX,
  ADMIN_MODULE_PREFIX,
  ADMIN_OPERATIONS,
  BACK_OFFICE_RECORDS,
  WEBHOOK_ROUTES,
  AI_CENTER_ROUTES,
  resolveRoutePermission,
  routeKey,
};
