import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

const SAFE_ENV = {
  BUZZARD_SALES_ENABLED: "0",
  NEXT_PUBLIC_SALES_ENABLED: "0",
  PRODUCTION_SAFETY_LOCK: "true",
  REAL_SUPPLIER_LIVE_IMPORT: "0",
  REAL_SUPPLIER_DRY_RUN: "1",
};

const GATE_NAMES = [
  "configuration",
  "authentication",
  "authorization",
  "apiProtection",
  "security",
  "audit",
  "monitoring",
  "alerting",
  "incidentReadiness",
  "backupReadiness",
  "databaseReadiness",
  "workerReadiness",
  "supplierReadiness",
  "productCatalogReadiness",
  "paymentReadiness",
  "commerceReadiness",
  "releaseReadiness",
  "rollbackReadiness",
  "environmentSafety",
  "goLiveApproval",
];

function resetSafeEnv() {
  process.env.BUZZARD_SALES_ENABLED = "0";
  process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
  process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  process.env.REAL_SUPPLIER_DRY_RUN = "1";
  delete process.env.REAL_SUPPLIER_API_KEY;
  delete process.env.BUZZARD_STRIPE_ENABLED;
  delete process.env.BUZZARD_PAYPAL_ENABLED;
}

describe("Part 26 — final production hardening center", () => {
  beforeEach(resetSafeEnv);

  it("1. final readiness exists", async () => {
    const mod = require("../lib/release/finalProductionHardening.js");
    const report = await mod.evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING).toBeDefined();
    expect(report.FINAL_PRODUCTION_HARDENING.version).toBe("part26");
  });

  it("2. all 20 gates returned", async () => {
    const mod = require("../lib/release/finalProductionHardening.js");
    const report = await mod.evaluateFinalProductionHardening();
    const names = report.FINAL_PRODUCTION_HARDENING.gates.map((g) => g.name);
    for (const expected of GATE_NAMES) {
      expect(names).toContain(expected);
    }
    expect(report.FINAL_PRODUCTION_HARDENING.gates.length).toBe(20);
  });

  it("3. configuration gate", async () => {
    const mod = require("../lib/release/finalProductionHardening.js");
    const report = await mod.evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "configuration");
    expect(["PASS", "CONDITION", "BLOCKED"]).toContain(g.status);
  });

  it("4. authentication gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "authentication");
    expect(g.status).toBe("PASS");
  });

  it("5. authorization gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "authorization");
    expect(g.status).toBe("PASS");
  });

  it("6. API protection gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "apiProtection");
    expect(["PASS", "CONDITION"]).toContain(g.status);
  });

  it("7. security gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "security");
    expect(g.status).toBe("PASS");
  });

  it("8. audit gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "audit");
    expect(g.status).toBe("PASS");
  });

  it("9. monitoring gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "monitoring");
    expect(g).toBeDefined();
  });

  it("10. alerting gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "alerting");
    expect(g).toBeDefined();
  });

  it("11. incident gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening({ adminDetail: true });
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "incidentReadiness");
    expect(g).toBeDefined();
    if (g.sampleFields) {
      expect(g.sampleFields).toHaveProperty("resolutionState");
    }
  });

  it("12. backup gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "backupReadiness");
    expect(g).toBeDefined();
  });

  it("13. database gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "databaseReadiness");
    expect(g).toBeDefined();
  });

  it("14. worker gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "workerReadiness");
    expect(g).toBeDefined();
  });

  it("15. supplier gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "supplierReadiness");
    expect(g.status).toBe("CONDITION");
    expect(g.credentialsConfigured).toBe(false);
    expect(g.connected).toBe(false);
  });

  it("16. product/catalog gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "productCatalogReadiness");
    expect(g.status).toBe("PASS");
  });

  it("17. payment gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "paymentReadiness");
    expect(g.status).toBe("PASS");
    expect(g.stripeEnabled).toBe(false);
    expect(g.paypalEnabled).toBe(false);
  });

  it("18. commerce gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "commerceReadiness");
    expect(g.status).toBe("PASS");
    expect(g.salesEnabled).toBe(false);
  });

  it("19. release gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "releaseReadiness");
    expect(g.status).toBe("PASS");
  });

  it("20. rollback gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "rollbackReadiness");
    expect(["PASS", "CONDITION"]).toContain(g.status);
    expect(g.automaticRollback).toBe(false);
  });

  it("21. environment safety gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "environmentSafety");
    expect(g.status).toBe("PASS");
  });

  it("22. go-live approval gate", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    const g = report.FINAL_PRODUCTION_HARDENING.gates.find((x) => x.name === "goLiveApproval");
    expect(g.status).toBe("BLOCKED");
    expect(g.autoActivate).toBe(false);
  });
});

describe("Part 26 — final go-live decision", () => {
  beforeEach(resetSafeEnv);

  it("23. sales remains disabled in decision", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.decision.salesEnabled).toBe(false);
  });

  it("24. supplier remains disconnected", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.decision.supplierLive).toBe(false);
    expect(report.FINAL_PRODUCTION_HARDENING.safety.credentialsConfigured).toBe(false);
  });

  it("25. live import remains disabled", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.safety.liveImportEnabled).toBe(false);
  });

  it("26. publish remains disabled (public products 0)", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.safety.publicProductCount).toBe(0);
  });

  it("27. Stripe remains OFF", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.safety.stripeEnabled).toBe(false);
  });

  it("28. PayPal remains OFF", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.safety.paypalEnabled).toBe(false);
  });

  it("29. secrets are redacted in audit", () => {
    const { recordFinalHardeningAction } = require("../lib/release/finalProductionHardeningAudit.js");
    const operationsAudit = require("../lib/operations/operationsAudit.js");
    const corrId = `fph_${crypto.randomBytes(4).toString("hex")}`;
    recordFinalHardeningAction(
      { adminUser: { email: "admin@test.de" }, correlationId: corrId },
      { metadata: { apiKey: "secret-key", password: "p@ss" }, dryRun: true }
    );
    const rows = operationsAudit.findByCorrelationId(corrId);
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain("secret-key");
    expect(JSON.stringify(rows)).not.toContain("p@ss");
  });

  it("30. autoActivate false", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.autoActivate).toBe(false);
    expect(report.FINAL_PRODUCTION_HARDENING.decision.autoActivate).toBe(false);
  });

  it("31. diagnosticOnly true", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.diagnosticOnly).toBe(true);
    expect(report.FINAL_PRODUCTION_HARDENING.decision.diagnosticOnly).toBe(true);
  });

  it("32. final decision is BLOCKED pre-go-live", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.decision.ready).toBe(false);
    expect(report.FINAL_PRODUCTION_HARDENING.decision.status).toBe("BLOCKED");
  });

  it("33. manifest is immutable and safe", async () => {
    const report = await require("../lib/release/finalProductionHardening.js").evaluateFinalProductionHardening();
    expect(report.FINAL_PRODUCTION_HARDENING.manifest.immutable).toBe(true);
    expect(report.FINAL_PRODUCTION_HARDENING.manifest.salesEnabled).toBe(false);
    expect(report.FINAL_PRODUCTION_HARDENING.manifest.paymentActivation).toBe(false);
  });
});

describe("Part 26 — RBAC and public endpoint", () => {
  it("34. public final health route is public", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/health/final-production-readiness").public).toBe(true);
  });

  it("35. admin final routes require permissions", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/admin/release/final-readiness").permission).toBe("system.read");
    expect(resolveRoutePermission("GET", "/api/admin/release/final-audit").permission).toBe("audit.read");
    expect(resolveRoutePermission("POST", "/api/admin/release/final-validate").permission).toBe("system.read");
  });

  it("36. public summary is minimal and safe", () => {
    resetSafeEnv();
    const { evaluatePublicFinalHardeningSummary } = require("../lib/release/finalProductionHardening.js");
    const summary = evaluatePublicFinalHardeningSummary();
    expect(summary.diagnosticOnly).toBe(true);
    expect(summary.autoActivate).toBe(false);
    expect(summary.salesEnabled).toBe(false);
    expect(summary.goLiveBlocked).toBe(true);
    expect(JSON.stringify(summary)).not.toMatch(/apiKey|password|secret|token/i);
  });
});

describe("Part 26 — safety invariants", () => {
  beforeEach(resetSafeEnv);

  it("37. environment safety fails when sales enabled", () => {
    process.env.BUZZARD_SALES_ENABLED = "1";
    const { evaluateEnvironmentSafety } = require("../lib/release/finalProductionHardening.js");
    const result = evaluateEnvironmentSafety();
    expect(result.status).toBe("BLOCKED");
  });

  it("38. go-live lock active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("39. admin safety gate blocks go-live activation", () => {
    const adminSafetyGate = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafetyGate.assertAdminAction("go_live", {
      req: { adminUser: { email: "admin@test.de" } },
      body: { enableSales: true },
    });
    expect(result.ok).toBe(false);
  });

  it("40. no supplier network call from readiness", () => {
    const connector = require("../lib/supplier/realSupplierConnector.js").createConnectorFromEnv();
    const status = connector.getStatus();
    expect(status.credentialsConfigured).toBe(false);
    expect(() => connector.fetchProducts()).toThrow();
  });

  it("41. Part 25 regression still works", async () => {
    const center = require("../lib/release/releaseReadinessCenter.js");
    const report = await center.evaluateProductionReleaseReadiness();
    expect(report.PRODUCTION_RELEASE_READINESS.autoActivate).toBe(false);
    expect(report.PRODUCTION_RELEASE_READINESS.gates.length).toBe(12);
  });

  it("42. version constant is part26", () => {
    const { FINAL_HARDENING_VERSION } = require("../core/finalProductionHardeningConstants.js");
    expect(FINAL_HARDENING_VERSION).toBe("part26");
  });
});
