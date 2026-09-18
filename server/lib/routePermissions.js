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
  "GET /api/health/final-production-go-live",
  "GET /api/health/final-production-governance",
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
  "GET /api/admin/supplier-foundation/overview": "suppliers.read",
  "GET /api/admin/supplier-foundation/:supplierId": "suppliers.read",
  "GET /api/admin/supplier-foundation/:supplierId/health": "suppliers.read",
  "POST /api/admin/supplier-foundation/:supplierId/sync": "suppliers.write",
  "POST /api/admin/supplier-foundation/:supplierId/enable": "suppliers.write",
  "POST /api/admin/supplier-foundation/:supplierId/disable": "suppliers.write",
  "POST /api/admin/supplier-foundation/:supplierId/order-dry-run": "suppliers.read",
  "GET /api/admin/supplier-foundation/:supplierId/order-sandbox": "suppliers.read",
  "POST /api/admin/supplier-foundation/:supplierId/order-sandbox-test": "suppliers.read",
  "GET /api/admin/fulfillment-control-tower/dashboard": "fulfillment.read",
  "GET /api/admin/fulfillment-control-tower/fulfillments": "fulfillment.read",
  "GET /api/admin/fulfillment-control-tower/fulfillments/:fulfillmentId": "fulfillment.read",
  "POST /api/admin/fulfillment-control-tower/reconcile": "fulfillment.reconcile",
  "GET /api/admin/fulfillment-control-tower/incidents": "fulfillment.incident.read",
  "POST /api/admin/fulfillment-control-tower/incidents/:incidentId/acknowledge": "fulfillment.incident.resolve",
  "POST /api/admin/fulfillment-control-tower/incidents/:incidentId/resolve": "fulfillment.incident.resolve",
  "GET /api/admin/fulfillment-control-tower/analytics": "fulfillment.read",
  "GET /api/admin/supplier-order-readiness/dashboard": "supplier-order.readiness.read",
  "GET /api/admin/supplier-order-readiness/records": "supplier-order.readiness.read",
  "GET /api/admin/supplier-order-readiness/records/:readinessId": "supplier-order.readiness.read",
  "POST /api/admin/supplier-order-readiness/evaluate": "supplier-order.readiness.read",
  "POST /api/admin/supplier-order-readiness/preview": "supplier-order.readiness.read",
  "POST /api/admin/supplier-order-readiness/approval/request": "supplier-order.readiness.request",
  "POST /api/admin/supplier-order-readiness/approval/:approvalId/approve": "supplier-order.readiness.approve",
  "POST /api/admin/supplier-order-readiness/approval/:approvalId/reject": "supplier-order.readiness.reject",
  "POST /api/admin/supplier-order-readiness/activate": "supplier-order.readiness.admin",
  "GET /api/admin/supplier-order-rehearsal/dashboard": "supplier-order.rehearsal.read",
  "GET /api/admin/supplier-order-rehearsal/records": "supplier-order.rehearsal.read",
  "GET /api/admin/supplier-order-rehearsal/records/:rehearsalId": "supplier-order.rehearsal.read",
  "POST /api/admin/supplier-order-rehearsal/run": "supplier-order.rehearsal.run",
  "GET /api/admin/supplier-production-validation/dashboard": "supplier-production-validation.read",
  "GET /api/admin/supplier-production-validation/records": "supplier-production-validation.read",
  "GET /api/admin/supplier-production-validation/records/:validationId": "supplier-production-validation.read",
  "POST /api/admin/supplier-production-validation/run": "supplier-production-validation.run",
  "GET /api/admin/supplier-order-activation/dashboard": "supplier-order.activation.read",
  "GET /api/admin/supplier-order-activation/records": "supplier-order.activation.read",
  "GET /api/admin/supplier-order-activation/records/:activationId": "supplier-order.activation.read",
  "POST /api/admin/supplier-order-activation/preflight": "supplier-order.activation.preflight",
  "POST /api/admin/supplier-order-activation/request": "supplier-order.activation.request",
  "POST /api/admin/supplier-order-activation/:activationId/approve": "supplier-order.activation.approve",
  "POST /api/admin/supplier-order-activation/:activationId/reject": "supplier-order.activation.approve",
  "POST /api/admin/supplier-order-activation/:activationId/arm": "supplier-order.activation.arm",
  "POST /api/admin/supplier-order-activation/:activationId/confirm": "supplier-order.activation.confirm",
  "POST /api/admin/supplier-order-activation/:activationId/revoke": "supplier-order.activation.revoke",
  "POST /api/admin/supplier-order-activation/:activationId/cancel": "supplier-order.activation.admin",
  "GET /api/admin/supplier-production-order-validation/dashboard": "supplier-production-order-validation.read",
  "GET /api/admin/supplier-production-order-validation/records": "supplier-production-order-validation.read",
  "GET /api/admin/supplier-production-order-validation/records/:validationId": "supplier-production-order-validation.read",
  "POST /api/admin/supplier-production-order-validation/run": "supplier-production-order-validation.run",
  "GET /api/admin/supplier-production-order-arming/dashboard": "supplier-production-order-arming.read",
  "GET /api/admin/supplier-production-order-arming/records": "supplier-production-order-arming.read",
  "GET /api/admin/supplier-production-order-arming/records/:armingId": "supplier-production-order-arming.read",
  "POST /api/admin/supplier-production-order-arming/request": "supplier-production-order-arming.request",
  "POST /api/admin/supplier-production-order-arming/approve": "supplier-production-order-arming.approve",
  "POST /api/admin/supplier-production-order-arming/arm": "supplier-production-order-arming.arm",
  "POST /api/admin/supplier-production-order-arming/disarm": "supplier-production-order-arming.disarm",
  "POST /api/admin/supplier-production-order-arming/preflight": "supplier-production-order-arming.read",
  "GET /api/admin/supplier-first-production-order/dashboard": "supplier-first-production-order.read",
  "GET /api/admin/supplier-first-production-order/records": "supplier-first-production-order.read",
  "GET /api/admin/supplier-first-production-order/records/:executionId": "supplier-first-production-order.read",
  "POST /api/admin/supplier-first-production-order/request": "supplier-first-production-order.request",
  "POST /api/admin/supplier-first-production-order/approve": "supplier-first-production-order.approve",
  "POST /api/admin/supplier-first-production-order/authorize": "supplier-first-production-order.execute",
  "POST /api/admin/supplier-first-production-order/execute": "supplier-first-production-order.execute",
  "POST /api/admin/supplier-first-production-order/cancel": "supplier-first-production-order.request",
  "GET /api/admin/supplier-controlled-go-live/dashboard": "supplier-controlled-go-live.read",
  "GET /api/admin/supplier-controlled-go-live/records": "supplier-controlled-go-live.read",
  "GET /api/admin/supplier-controlled-go-live/records/:goLiveId": "supplier-controlled-go-live.read",
  "POST /api/admin/supplier-controlled-go-live/request-review": "supplier-controlled-go-live.review",
  "POST /api/admin/supplier-controlled-go-live/approve": "supplier-controlled-go-live.approve",
  "POST /api/admin/supplier-controlled-go-live/activate": "supplier-controlled-go-live.activate",
  "POST /api/admin/supplier-controlled-go-live/rollback": "supplier-controlled-go-live.rollback",
  "POST /api/admin/supplier-controlled-go-live/pause": "supplier-controlled-go-live.activate",
  "GET /api/admin/supplier-go-live-observation/dashboard": "supplier-observation.read",
  "GET /api/admin/supplier-go-live-observation/records/:observationId": "supplier-observation.read",
  "POST /api/admin/supplier-go-live-observation/start": "supplier-observation.manage",
  "POST /api/admin/supplier-go-live-observation/pause": "supplier-observation.manage",
  "POST /api/admin/supplier-go-live-observation/complete-review": "supplier-observation.review",
  "POST /api/admin/supplier-go-live-observation/request-rollout-approval": "supplier-observation.review",
  "POST /api/admin/supplier-go-live-observation/approve-rollout": "supplier-rollout.approve",
  "POST /api/admin/supplier-go-live-observation/activate-rollout": "supplier-rollout.activate",
  "POST /api/admin/supplier-go-live-observation/pause-rollout": "supplier-rollout.activate",
  "POST /api/admin/supplier-go-live-observation/rollback-rollout": "supplier-rollout.rollback",
  "GET /api/admin/final-production-go-live/dashboard": "system.read",
  "GET /api/admin/final-production-go-live/missing-access": "system.read",
  "GET /api/admin/final-production-go-live/status-report": "system.read",
  "GET /api/admin/final-production-go-live/completion": "system.read",
  "GET /api/admin/final-production-go-live/closure": "system.read",
  "GET /api/admin/final-production-go-live/operations": "system.read",
  "GET /api/admin/final-production-go-live/go-live-check": "system.read",
  "GET /api/admin/inter-cars-production-access/dashboard": "supplier-observation.read",
  "POST /api/admin/inter-cars-production-access/preflight": "supplier-observation.manage",
  "GET /api/admin/supplier-foundation/:supplierId/cursor": "suppliers.read",
  "POST /api/admin/supplier-foundation/:supplierId/cursor/reset": "suppliers.write",
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
  "GET /api/admin/returns": "returns.read",
  "GET /api/admin/returns-health": "returns.read",
  "GET /api/admin/returns/:id": "returns.read",
  "POST /api/admin/returns": "returns.write",
  "POST /api/admin/returns/:id/approve": "returns.approve",
  "POST /api/admin/returns/:id/receive": "returns.write",
  "POST /api/admin/returns/:id/inspect": "returns.inspect",
  "POST /api/admin/returns/:id/refund/calculate": "returns.refund",
  "POST /api/admin/returns/:id/refund/request": "returns.refund",
  "POST /api/admin/returns/:id/supplier-recovery": "returns.supplier_recovery",
  "POST /api/admin/returns/:id/supplier-recovery/confirm": "returns.supplier_recovery",
  "POST /api/admin/returns/:id/reconcile": "returns.read",
  "POST /api/admin/returns/:id/close": "returns.close",
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
  { prefix: "/api/admin/returns", read: "returns.read", write: "returns.write" },
  { prefix: "/api/admin/automotive", read: "products.read", write: "products.write" },
  { prefix: "/api/admin/global", read: "products.read", write: "products.write" },
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
