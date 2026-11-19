import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ADMIN_NAV_GROUPS, adminHref } from "../../lib/admin/nav.config.mjs";
import {
  NAV_SLUG_PERMISSIONS,
  ROLE_PERMISSIONS,
  adminSlugOfPath,
  canAccess,
  canAccessNavSlug,
  filterNavGroupsForRole,
  firstAccessibleSlug,
} from "../../lib/admin/navPermissions.mjs";
import { isPimImportPending, pimImportPendingSummary } from "../../lib/admin/pimCoreTypes.ts";
import { ANALYTICS_SECTIONS, analyticsSectionsForRole, canSeeAnalyticsSection } from "../../lib/analytics/sections.mjs";

import { ALL_ROLES, startIsolatedApi } from "./support/isolatedApi.mjs";

const require = createRequire(import.meta.url);
const { PERMISSIONS, can } = require("../lib/rbac.js");
const { resolveRoutePermission } = require("../lib/routePermissions.js");
const analyticsEngine = require("../lib/analyticsEngine.js");
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const navSlugs = ADMIN_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.slug));

describe("role table of the admin pages", () => {
  it("is the same as the role table of the API", () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(Object.keys(PERMISSIONS).sort());
    for (const role of Object.keys(PERMISSIONS)) {
      expect([...ROLE_PERMISSIONS[role]].sort(), role).toEqual([...PERMISSIONS[role]].sort());
    }
  });

  it("answers every permission question as the API does", () => {
    const permissions = new Set([...Object.values(PERMISSIONS).flat(), ...Object.values(NAV_SLUG_PERMISSIONS)]);
    permissions.delete("*");
    permissions.add("no.such.permission");
    for (const role of [...Object.keys(PERMISSIONS), "unknown_role", ""]) {
      for (const permission of permissions) {
        expect(canAccess(role, permission), `${role} ${permission}`).toBe(can(role, permission));
      }
    }
  });

  it("gives an unknown or missing role nothing", () => {
    for (const role of ["", "unknown_role", undefined, null]) {
      expect(filterNavGroupsForRole(ADMIN_NAV_GROUPS, role)).toEqual([]);
      expect(firstAccessibleSlug(ADMIN_NAV_GROUPS, role)).toBeNull();
      expect(canAccessNavSlug(role, "control-center")).toBe(false);
      expect(canAccessNavSlug(role, "page-that-does-not-exist")).toBe(false);
    }
  });
});

describe("navigation of the admin pages", () => {
  it("lists only pages that exist, each once", () => {
    expect(new Set(navSlugs).size).toBe(navSlugs.length);
    for (const slug of navSlugs) {
      const page = path.join(repoRoot, "app", "admin", slug, "page.tsx");
      expect(existsSync(page), adminHref(slug)).toBe(true);
    }
  });

  it("has no permission entry for a page that is not in the navigation", () => {
    for (const slug of Object.keys(NAV_SLUG_PERMISSIONS)) {
      expect(navSlugs, slug).toContain(slug);
    }
  });

  it("asks only for permissions that some role of the API has", () => {
    // "returns" reads /api/admin/returns, which the API does not offer; its
    // permission is held by no role, so only administrators are shown the page.
    const administratorsOnly = { returns: "returns.read" };
    const known = new Set(Object.values(PERMISSIONS).flat());
    for (const [slug, permission] of Object.entries(NAV_SLUG_PERMISSIONS)) {
      if (administratorsOnly[slug] === permission) {
        expect(known.has(permission), `${slug}: ${permission}`).toBe(false);
        continue;
      }
      expect(known.has(permission), `${slug}: ${permission}`).toBe(true);
    }
  });

  it("shows a page without a permission entry to administrators only", () => {
    const unmapped = navSlugs.filter((slug) => !(slug in NAV_SLUG_PERMISSIONS));
    for (const slug of [...unmapped, "page-that-does-not-exist"]) {
      for (const role of ["catalog_manager", "order_manager", "staff", "ai_agent", "read_only"]) {
        expect(canAccessNavSlug(role, slug), `${role} ${slug}`).toBe(false);
      }
      expect(canAccessNavSlug("administrator", slug)).toBe(true);
    }
  });

  it("gives every role of the API a first page, and the dashboard only to roles that may read the system state", () => {
    for (const role of Object.keys(PERMISSIONS)) {
      const first = firstAccessibleSlug(ADMIN_NAV_GROUPS, role);
      expect(first, role).not.toBeNull();
      expect(canAccessNavSlug(role, first), role).toBe(true);
      expect(canAccessNavSlug(role, ""), role).toBe(can(role, "system.read"));
    }
    expect(firstAccessibleSlug(ADMIN_NAV_GROUPS, "ai_agent")).toBe("ai-center");
  });

  it("finds the page a path belongs to", () => {
    expect(adminSlugOfPath("/admin/")).toBe("");
    expect(adminSlugOfPath("/admin")).toBe("");
    expect(adminSlugOfPath("/admin/pim-core/")).toBe("pim-core");
    expect(adminSlugOfPath("/admin/products/prod-000001/")).toBe("products");
    expect(adminSlugOfPath("/produkt/x/")).toBe("");
  });
});

describe("analytics sections of the admin pages", () => {
  it("are the sections the API gives each role", () => {
    for (const role of [...Object.keys(PERMISSIONS), "unknown_role"]) {
      const server = new Set(analyticsEngine.roleSections(role));
      if (analyticsEngine.canSeeFinance(role)) server.add("finance");
      else server.delete("finance");
      expect(analyticsSectionsForRole(role).sort(), role).toEqual([...server].sort());
      for (const section of ANALYTICS_SECTIONS) {
        expect(canSeeAnalyticsSection(role, section), `${role} ${section}`).toBe(server.has(section));
      }
    }
    expect(analyticsSectionsForRole("")).toEqual([]);
    expect(analyticsSectionsForRole(undefined)).toEqual([]);
  });

  it("match what the API answers: a section outside the role's set is refused", () => {
    const range = analyticsEngine.resolveRange({ range: "last_30_days" });
    const calls = {
      sales: (role) => analyticsEngine.computeSalesAnalytics(range, role),
      products: (role) => analyticsEngine.computeProductAnalytics(range, role),
      categories: (role) => analyticsEngine.computeCategoryAnalytics(range, role),
      customers: (role) => analyticsEngine.computeCustomerAnalytics(range, role),
      inventory: (role) => analyticsEngine.computeInventoryAnalytics(role),
      suppliers: (role) => analyticsEngine.computeSupplierAnalytics(range, role),
      finance: (role) => analyticsEngine.computeFinanceAnalytics(range, role),
      returns: (role) => analyticsEngine.computeReturnsAnalytics(range, role),
    };
    for (const role of Object.keys(PERMISSIONS)) {
      for (const [section, call] of Object.entries(calls)) {
        expect(call(role).forbidden === true, `${role} ${section}`).toBe(!canSeeAnalyticsSection(role, section));
      }
    }
  });
});

describe("actions the admin pages offer", () => {
  // Permission the page checks before it offers the action -> route the action calls.
  const actions = [
    ["products.write", "POST", "/api/admin/pim-core/import"],
    ["products.write", "POST", "/api/admin/pim-core/products/p1/validate"],
    ["security.manage", "DELETE", "/api/admin/sessions/sess-1"],
    ["ai.execute", "POST", "/api/ai-center/chat"],
    ["ai.assign", "POST", "/api/admin/ai/tasks"],
    ["ai.execute", "POST", "/api/admin/approvals/appr-1/decide"],
    ["categories.write", "PATCH", "/api/admin/categories/cat-01/visibility"],
    ["system.configure", "POST", "/api/admin/automation/worker/pause"],
    ["system.configure", "POST", "/api/admin/automation/jobs/job-1/retry"],
    ["system.configure", "POST", "/api/admin/automation/jobs/job-1/cancel"],
    ["sync.run", "POST", "/api/admin/automation/sync/product"],
    ["system.configure", "POST", "/api/admin/commerce/go-live/request"],
    ["system.configure", "POST", "/api/admin/commerce/go-live/req-1/approve"],
  ];
  const reads = [
    ["ai.read", "GET", "/api/admin/ai/employees"],
    ["ai.read", "GET", "/api/admin/ai/tasks"],
    ["ai.read", "GET", "/api/admin/approvals"],
    ["integrations.read", "GET", "/api/admin/control-center/integrations"],
    ["integrations.read", "GET", "/api/admin/automation/integrations/health"],
    ["audit.read", "GET", "/api/admin/control-center/activity"],
    ["categories.read", "GET", "/api/admin/categories/visibility"],
    ["system.read", "GET", "/api/admin/control-center/summary"],
    ["analytics.read", "GET", "/api/admin/analytics/overview"],
    ["analytics.read", "GET", "/api/admin/analytics/sales"],
  ];

  it.each([...actions, ...reads])("are offered under the permission the API asks for: %s %s %s", (permission, method, route) => {
    const policy = resolveRoutePermission(method, route);
    expect(policy?.permission, `${method} ${route}`).toBe(permission);
  });
});

describe("import request that waits for approval", () => {
  const answer = {
    success: true,
    pendingApproval: true,
    executed: false,
    dryRun: true,
    approval: { id: "appr_1", status: "PENDING", riskLevel: "HIGH", resourceId: "auto_1", metadata: { jobId: "auto_1" } },
    job: null,
  };

  it("is recognised as pending, never as a result", () => {
    expect(isPimImportPending(answer)).toBe(true);
    expect(isPimImportPending({ importJobId: "imp_1", dryRun: true, stages: [], validation: { overall: "PASS" } })).toBe(false);
  });

  it("names the approval and the reserved job id, from the explicit fields or from the approval", () => {
    expect(pimImportPendingSummary(answer)).toEqual({ approvalId: "appr_1", importJobId: "auto_1", status: "PENDING", riskLevel: "HIGH" });
    expect(pimImportPendingSummary({ ...answer, approvalId: "appr_2", importJobId: "auto_2" })).toMatchObject({
      approvalId: "appr_2",
      importJobId: "auto_2",
    });
    expect(pimImportPendingSummary({ ...answer, approval: null })).toEqual({
      approvalId: null,
      importJobId: null,
      status: "PENDING",
      riskLevel: null,
    });
  });
});

describe("what the pages check, against the running API", () => {
  /** @type {Awaited<ReturnType<typeof startIsolatedApi>>} */
  let api;
  const tokens = {};

  beforeAll(async () => {
    api = await startIsolatedApi({ env: { BUZZARD_TEST_MODE: "1" } });
    for (const role of ALL_ROLES) tokens[role] = await api.login(role);
  }, 90_000);
  afterAll(async () => api?.stop());

  // Route a page reads -> every permission the page checks before it asks for it.
  // Some handlers ask for more than the central policy names; the pages check both.
  const reads = [
    ["/api/admin/pim-core/products", ["products.read"]],
    ["/api/admin/pim-core/supplier-mappings", ["products.read", "suppliers.read"]],
    ["/api/admin/commerce/overview", ["system.read"]],
    ["/api/admin/commerce/security-events", ["system.read", "security.read"]],
    ["/api/submissions", ["orders.read"]],
    ["/api/admin/control-center/summary", ["system.read"]],
    ["/api/admin/control-center/integrations", ["integrations.read"]],
    ["/api/admin/control-center/activity", ["audit.read"]],
    ["/api/admin/ai/employees", ["ai.read"]],
    ["/api/admin/ai/tasks", ["ai.read"]],
    ["/api/admin/approvals?status=PENDING", ["ai.read"]],
    ["/api/admin/categories/visibility", ["categories.read"]],
    ["/api/admin/sessions", ["security.read"]],
    ["/api/admin/analytics/overview?range=last_30_days", ["analytics.read"]],
  ];

  it.each(reads)("%s is answered exactly for the roles the page asks for it", async (route, permissions) => {
    for (const role of ALL_ROLES) {
      const res = await api.request("GET", route, { token: tokens[role] });
      const expected = permissions.every((permission) => can(role, permission)) ? 200 : 403;
      expect(res.status, `${role} ${route}`).toBe(expected);
    }
  });

  it("gives each role exactly its analytics sections", async () => {
    const routes = {
      sales: "/api/admin/analytics/sales?range=last_30_days",
      products: "/api/admin/analytics/products?range=last_30_days",
      categories: "/api/admin/analytics/categories?range=last_30_days",
      customers: "/api/admin/analytics/customers?range=last_30_days",
      inventory: "/api/admin/analytics/inventory",
      suppliers: "/api/admin/analytics/suppliers?range=last_30_days",
      finance: "/api/admin/analytics/finance?range=last_30_days",
    };
    for (const role of ALL_ROLES) {
      for (const [section, route] of Object.entries(routes)) {
        const res = await api.request("GET", route, { token: tokens[role] });
        const expected = can(role, "analytics.read") && canSeeAnalyticsSection(role, section) ? 200 : 403;
        expect(res.status, `${role} ${section}`).toBe(expected);
      }
    }
  });

  it("holds an import dry run for approval, names approval and job, and imports nothing", async () => {
    const before = await api.request("GET", "/api/admin/pim-core/products", { token: tokens.administrator });
    for (const role of ALL_ROLES) {
      const res = await api.request("POST", "/api/admin/pim-core/import", {
        token: tokens[role],
        body: { raw: { sku: `BZ-UI-CONTRACT-${role}` }, dryRun: true },
      });
      const offered = can(role, "products.write") && can(role, "imports.run");
      expect(res.status, role).toBe(offered ? 202 : 403);
      if (!offered) continue;
      expect(res.json).toMatchObject({ success: true, pendingApproval: true, executed: false, dryRun: true, job: null });
      expect(res.json.approvalId).toBe(res.json.approval.id);
      expect(res.json.importJobId).toBe(res.json.approval.metadata.jobId);
      expect(res.json.approval).toMatchObject({ status: "PENDING", resourceType: "pim_import", resourceId: res.json.importJobId });
      expect(isPimImportPending(res.json)).toBe(true);
      expect(pimImportPendingSummary(res.json)).toEqual({
        approvalId: res.json.approval.id,
        importJobId: res.json.importJobId,
        status: "PENDING",
        riskLevel: res.json.approval.riskLevel,
      });
      // The reserved job id is not a job that exists or ran.
      const job = await api.request("GET", `/api/admin/automation/jobs/${res.json.importJobId}`, { token: tokens.administrator });
      expect(job.status, "reserved job").toBe(404);
    }
    const after = await api.request("GET", "/api/admin/pim-core/products", { token: tokens.administrator });
    expect(after.json).toEqual(before.json);
  });

  it("serves the catalog's own categories to roles with products.read; the public path is the taxonomy", async () => {
    for (const role of Object.keys(tokens)) {
      const res = await api.request("GET", "/api/admin/catalog/categories", { token: tokens[role] });
      const allowed = canAccess(role, "products.read");
      expect(res.status, role).toBe(allowed ? 200 : 403);
      if (allowed) expect(Array.isArray(res.json), `${role}: a list`).toBe(true);
    }
    const anonymous = await api.request("GET", "/api/admin/catalog/categories");
    expect(anonymous.status).toBe(401);

    // Why the admin page cannot use the public path: it answers with an object, and with other records.
    const taxonomy = await api.request("GET", "/api/catalog/categories");
    expect(taxonomy.status).toBe(200);
    expect(Array.isArray(taxonomy.json)).toBe(false);
    expect(Array.isArray(taxonomy.json.categories)).toBe(true);
    expect(String(taxonomy.json.categories[0].id)).toMatch(/^cat-/);
  });

  it("records an approval without starting anything: no job, approval unused, products as they were", async () => {
    const admin = tokens.administrator;
    const before = await api.request("GET", "/api/admin/pim-core/products", { token: admin });
    const jobsBefore = await api.request("GET", "/api/admin/automation/jobs", { token: admin });
    const spec = { raw: { sku: "BZ-UI-CONTRACT-APPROVED" }, dryRun: true };
    const submitted = await api.request("POST", "/api/admin/pim-core/import", { token: tokens.catalog_manager, body: spec });
    expect(submitted.status).toBe(202);

    // The requester may not decide; a role with ai.execute may.
    const own = await api.request("POST", `/api/admin/approvals/${submitted.json.approvalId}/decide`, {
      token: tokens.catalog_manager,
      body: { decision: "approve" },
    });
    expect(own.status).toBe(403);
    const decided = await api.request("POST", `/api/admin/approvals/${submitted.json.approvalId}/decide`, {
      token: admin,
      body: { decision: "approve" },
    });
    expect(decided.status).toBe(200);
    expect(decided.json.approval).toMatchObject({ id: submitted.json.approvalId, status: "APPROVED" });

    const all = await api.request("GET", "/api/admin/approvals", { token: admin });
    const record = all.json.approvals.find((entry) => entry.id === submitted.json.approvalId);
    expect(record).toMatchObject({ status: "APPROVED", metadata: { consumed: false } });

    // Nothing was queued or started, and the reserved id is still no job.
    const jobsAfter = await api.request("GET", "/api/admin/automation/jobs", { token: admin });
    expect(jobsAfter.json.jobs).toEqual(jobsBefore.json.jobs);
    const reserved = await api.request("GET", `/api/admin/automation/jobs/${submitted.json.importJobId}`, { token: admin });
    expect(reserved.status).toBe(404);
    const worker = await api.request("GET", "/api/admin/automation/worker", { token: admin });
    expect(worker.json.worker).toMatchObject({ status: "STOPPED", jobsProcessed: 0 });

    // Sending the approved request again does not use the approval: it opens a new request.
    const again = await api.request("POST", "/api/admin/pim-core/import", { token: tokens.catalog_manager, body: spec });
    expect(again.status).toBe(202);
    expect(again.json).toMatchObject({ pendingApproval: true, executed: false, job: null });
    expect(again.json.approvalId).not.toBe(submitted.json.approvalId);
    expect(again.json.approval.status).toBe("PENDING");

    // A request that asks for a real import is held as a dry run as well.
    const real = await api.request("POST", "/api/admin/pim-core/import", {
      token: tokens.catalog_manager,
      body: { ...spec, dryRun: false },
    });
    expect(real.status).toBe(202);
    expect(real.json).toMatchObject({ pendingApproval: true, executed: false, dryRun: true, job: null });

    const after = await api.request("GET", "/api/admin/pim-core/products", { token: admin });
    expect(after.json).toEqual(before.json);
    expect(JSON.stringify(after.json)).not.toContain("BZ-UI-CONTRACT-APPROVED");
  });
});
