import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

describe("Part 21 — security readiness", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
  });

  it("1. returns 10-gate security readiness diagnostic only", () => {
    const securityReadiness = require("../lib/security/securityReadiness.js");
    const report = securityReadiness.evaluateSecurityReadiness();
    expect(report.SECURITY_READINESS.diagnosticOnly).toBe(true);
    expect(report.SECURITY_READINESS.autoActivate).toBe(false);
    expect(report.SECURITY_READINESS.gates.length).toBe(10);
  });

  it("2. public security readiness does not expose admin detail", () => {
    const securityReadiness = require("../lib/security/securityReadiness.js");
    const report = securityReadiness.evaluateSecurityReadiness({ adminDetail: false });
    const authGate = report.SECURITY_READINESS.gates.find((g) => g.gate === "AUTHENTICATION");
    expect(authGate.lockoutsActive).toBeUndefined();
  });

  it("3. production safety gate PASS with sales OFF", () => {
    const securityReadiness = require("../lib/security/securityReadiness.js");
    const report = securityReadiness.evaluateSecurityReadiness();
    const safety = report.SECURITY_READINESS.gates.find((g) => g.gate === "PRODUCTION_SAFETY");
    expect(safety.status).toBe("PASS");
    const payment = report.SECURITY_READINESS.gates.find((g) => g.gate === "PAYMENT_SAFETY");
    expect(payment.status).toBe("PASS");
  });
});

describe("Part 21 — security audit", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  });

  it("4. audit returns structured findings without secrets", () => {
    const { runSecurityAudit } = require("../lib/security/securityAudit.js");
    const audit = runSecurityAudit();
    expect(audit.secretsExposed).toBe(false);
    expect(audit.diagnosticOnly).toBe(true);
    expect(Array.isArray(audit.findings)).toBe(true);
    expect(JSON.stringify(audit)).not.toMatch(/sk_live|api_key|password/i);
  });

  it("5. CRITICAL finding makes audit FAIL when sales enabled", () => {
    process.env.BUZZARD_SALES_ENABLED = "1";
    const { runSecurityAudit } = require("../lib/security/securityAudit.js");
    const audit = runSecurityAudit();
    expect(audit.overall).toBe("FAIL");
    expect(audit.criticalCount).toBeGreaterThan(0);
    process.env.BUZZARD_SALES_ENABLED = "0";
  });
});

describe("Part 21 — incident enrichment", () => {
  it("6. enriches incidents with occurrence count and resolution state", () => {
    const { enrichIncidents } = require("../lib/operations/incidentReadiness.js");
    const enriched = enrichIncidents([
      {
        level: "WARNING",
        component: "JOBS",
        code: "jobs_failed",
        message: "1 failed",
        timestamp: "2026-09-01T10:00:00.000Z",
      },
      {
        level: "WARNING",
        component: "JOBS",
        code: "jobs_failed",
        message: "1 failed",
        timestamp: "2026-09-02T10:00:00.000Z",
        correlationId: "corr_abc",
      },
    ]);
    expect(enriched.length).toBe(1);
    expect(enriched[0].occurrenceCount).toBe(2);
    expect(enriched[0].correlationId).toBe("corr_abc");
    expect(enriched[0].resolutionState).toBe("OPEN");
    expect(enriched[0].firstDetected).toBe("2026-09-01T10:00:00.000Z");
    expect(enriched[0].lastDetected).toBe("2026-09-02T10:00:00.000Z");
  });

  it("7. incident report remains fail-closed", async () => {
    const incidentReadiness = require("../lib/operations/incidentReadiness.js");
    const report = await incidentReadiness.getIncidentReadiness();
    expect(report.secretsExposed).toBe(false);
    expect(report.failClosed).toBe(true);
    expect(report.enriched).toBe(true);
  });
});

describe("Part 21 — alert readiness", () => {
  it("8. alert readiness is diagnostic with internal channel configured", async () => {
    const alertReadiness = require("../lib/operations/alertReadiness.js");
    const report = await alertReadiness.getAlertReadiness();
    expect(report.diagnosticOnly).toBe(true);
    expect(report.autoActivate).toBe(false);
    expect(report.channels.INTERNAL.status).toBe("CONFIGURED");
    expect(report.secretsExposed).toBe(false);
  });
});

describe("Part 21 — operational metrics", () => {
  it("9. metrics do not expose secrets", async () => {
    const operationalMetrics = require("../lib/operations/operationalMetrics.js");
    const metrics = await operationalMetrics.getOperationalMetrics();
    expect(metrics.secretsExposed).toBe(false);
    expect(metrics.diagnosticOnly).toBe(true);
    expect(typeof metrics.blocked).toBe("object");
  });
});

describe("Part 21 — RBAC route permissions", () => {
  it("10. security admin routes require permissions", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/health/security-readiness").public).toBe(true);
    expect(resolveRoutePermission("GET", "/api/admin/security/readiness").permission).toBe("security.read");
    expect(resolveRoutePermission("GET", "/api/admin/security/audit").permission).toBe("security.read");
    expect(resolveRoutePermission("GET", "/api/admin/monitoring/readiness").permission).toBe("system.read");
  });
});

describe("Part 21 — admin dashboard extension", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("11. Part 20 dashboard extended with securityObservability", async () => {
    const adminReadiness = require("../lib/operations/adminReadiness.js");
    const dashboard = await adminReadiness.getAdminDashboardSnapshot();
    expect(dashboard.securityObservability).toBeDefined();
    expect(dashboard.securityObservability.securityReadiness).toBeDefined();
    expect(dashboard.securityObservability.alertReadiness).toBeDefined();
    expect(dashboard.securityObservability.incidents).toBeDefined();
    expect(dashboard.diagnosticOnly).toBe(true);
  });
});

describe("Part 21 — secret redaction", () => {
  it("12. security readiness redacts sensitive metadata", () => {
    const { redactForLog } = require("../lib/security.js");
    const redacted = redactForLog({ apiKey: "secret-value", ok: true });
    expect(JSON.stringify(redacted)).not.toContain("secret-value");
  });
});

describe("Part 21 — correlation IDs", () => {
  it("13. correlation context generates IDs", () => {
    const correlationContext = require("../lib/operations/correlationContext.js");
    const reqId = correlationContext.newRequestId();
    const corrId = correlationContext.newCorrelationId();
    expect(reqId.startsWith("req_")).toBe(true);
    expect(corrId.startsWith("corr_")).toBe(true);
  });

  it("14. admin audit records correlation without secrets", () => {
    const { recordAdminAction } = require("../lib/operations/adminActionAudit.js");
    const operationsAudit = require("../lib/operations/operationsAudit.js");
    const corrId = `p21_${crypto.randomBytes(4).toString("hex")}`;
    recordAdminAction(
      { adminUser: { email: "admin@test.de" }, correlationId: corrId },
      {
        action: "admin.change",
        resource: "security_audit",
        resourceId: "view",
        metadata: { token: "hide-me" },
      }
    );
    const rows = operationsAudit.findByCorrelationId(corrId);
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain("hide-me");
  });
});

describe("Part 21 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("15. go-live lock remains active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("16. admin safety gate blocks sales activation", () => {
    const adminSafetyGate = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafetyGate.assertAdminAction("sales_config", {
      req: { adminUser: { email: "admin@test.de" } },
      body: { enableSales: true },
    });
    expect(result.ok).toBe(false);
  });

  it("17. supplier dry-run with no credentials", () => {
    const supplier = require("../lib/supplier/realSupplierConnector.js").createConnectorFromEnv().getStatus();
    expect(supplier.dryRun).toBe(true);
    expect(supplier.liveImportEnabled).toBe(false);
    expect(supplier.credentialsConfigured).toBe(false);
  });

  it("18. public catalog sales OFF", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    expect(catalogReadService.getHealth().salesEnabled).toBe(false);
    expect(catalogReadService.getHealth().productCount).toBe(0);
  });
});
