import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

describe("Part 20 — admin readiness aggregator", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("1. returns 12-gate admin backoffice readiness", async () => {
    const adminReadiness = require("../lib/operations/adminReadiness.js");
    const report = await adminReadiness.evaluateAdminReadiness();
    expect(report.ADMIN_BACKOFFICE_READINESS.diagnosticOnly).toBe(true);
    expect(report.ADMIN_BACKOFFICE_READINESS.autoActivate).toBe(false);
    expect(report.ADMIN_BACKOFFICE_READINESS.gates.length).toBe(12);
  });

  it("2. dashboard snapshot is diagnostic only", async () => {
    const adminReadiness = require("../lib/operations/adminReadiness.js");
    const dashboard = await adminReadiness.getAdminDashboardSnapshot();
    expect(dashboard.diagnosticOnly).toBe(true);
    expect(dashboard.autoActivate).toBe(false);
    expect(dashboard.readiness.gates.length).toBe(12);
  });

  it("3. safety gate PASS with sales OFF", async () => {
    const adminReadiness = require("../lib/operations/adminReadiness.js");
    const report = await adminReadiness.evaluateAdminReadiness();
    const safety = report.ADMIN_BACKOFFICE_READINESS.gates.find((g) => g.gate === "COMMERCE_SAFETY");
    expect(safety.status).toBe("PASS");
    const adminSafety = report.ADMIN_BACKOFFICE_READINESS.gates.find((g) => g.gate === "ADMIN_SAFETY");
    expect(adminSafety.status).toBe("PASS");
  });
});

describe("Part 20 — admin safety gate", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("4. blocks sales activation attempt", () => {
    const adminSafetyGate = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafetyGate.assertAdminAction("sales_config", {
      req: { adminUser: { email: "admin@test.de" }, correlationId: "c1" },
      body: { enableSales: true },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.gate === "sales")).toBe(true);
  });

  it("5. blocks supplier order attempt", () => {
    const adminSafetyGate = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafetyGate.assertAdminAction("supplier_order", {
      req: { adminUser: { email: "admin@test.de" } },
      body: { submitOrder: true },
    });
    expect(result.ok).toBe(false);
  });

  it("6. blocks payment activation while sales OFF", () => {
    const adminSafetyGate = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafetyGate.assertAdminAction("payment_config", {
      req: { adminUser: { email: "admin@test.de" } },
      body: { enablePayments: true, BUZZARD_PAYMENT_ENABLED: "1" },
    });
    expect(result.ok).toBe(false);
  });
});

describe("Part 20 — admin audit", () => {
  it("7. records admin action without secrets", () => {
    const { recordAdminAction } = require("../lib/operations/adminActionAudit.js");
    const operationsAudit = require("../lib/operations/operationsAudit.js");
    const corrId = `adm_${crypto.randomBytes(4).toString("hex")}`;
    recordAdminAction(
      { adminUser: { email: "admin@test.de" }, correlationId: corrId },
      {
        action: "admin.change",
        resource: "test",
        resourceId: "t1",
        metadata: { apiKey: "secret-redact-me" },
      }
    );
    const rows = operationsAudit.findByCorrelationId(corrId);
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain("secret-redact-me");
  });
});

describe("Part 20 — incident readiness", () => {
  it("8. incident report does not expose secrets", async () => {
    const incidentReadiness = require("../lib/operations/incidentReadiness.js");
    const report = await incidentReadiness.getIncidentReadiness();
    expect(report.secretsExposed).toBe(false);
    expect(report.failClosed).toBe(true);
    expect(typeof report.overall).toBe("string");
  });
});

describe("Part 20 — RBAC route permissions", () => {
  it("9. admin operations routes require permissions", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    const readiness = resolveRoutePermission("GET", "/api/admin/operations/readiness");
    expect(readiness.public).toBeFalsy();
    expect(readiness.permission).toBe("system.read");
    const audit = resolveRoutePermission("GET", "/api/admin/operations/audit");
    expect(audit.permission).toBe("audit.read");
  });
});

describe("Part 20 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  });

  it("10. go-live lock remains active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("11. canActivateSales blocked by production lock", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    const activation = goLiveApproval.canActivateSales();
    expect(activation.allowed).toBe(false);
  });

  it("12. stripe and paypal OFF", () => {
    const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags.js");
    const flags = getEffectiveFlags();
    expect(flags.stripeEnabled).toBe(false);
    expect(flags.paypalEnabled).toBe(false);
  });

  it("13. public catalog sales OFF", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    expect(catalogReadService.getHealth().salesEnabled).toBe(false);
  });

  it("14. CRITICAL_ACTIONS includes publish and restore", () => {
    const { CRITICAL_ACTIONS } = require("../lib/operations/adminSafetyGate.js");
    expect(CRITICAL_ACTIONS.has("publish")).toBe(true);
    expect(CRITICAL_ACTIONS.has("restore")).toBe(true);
    expect(CRITICAL_ACTIONS.has("sales_config")).toBe(true);
  });
});
