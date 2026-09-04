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

describe("Part 25 — release readiness center", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("1. production release readiness is diagnostic only", async () => {
    const center = require("../lib/release/releaseReadinessCenter.js");
    const report = await center.evaluateProductionReleaseReadiness();
    expect(report.PRODUCTION_RELEASE_READINESS.diagnosticOnly).toBe(true);
    expect(report.PRODUCTION_RELEASE_READINESS.autoActivate).toBe(false);
    expect(report.PRODUCTION_RELEASE_READINESS.gates.length).toBe(12);
  });

  it("2. go-live gate remains BLOCKED", async () => {
    const center = require("../lib/release/releaseReadinessCenter.js");
    const report = await center.evaluateProductionReleaseReadiness();
    const goLive = report.PRODUCTION_RELEASE_READINESS.gates.find((g) => g.name === "goLive");
    expect(goLive.status).toBe("BLOCKED");
  });

  it("3. manifest disables live actions", async () => {
    const center = require("../lib/release/releaseReadinessCenter.js");
    const report = await center.evaluateProductionReleaseReadiness();
    expect(report.PRODUCTION_RELEASE_READINESS.manifest.supplierLiveImport).toBe(false);
    expect(report.PRODUCTION_RELEASE_READINESS.manifest.salesEnabled).toBe(false);
    expect(report.PRODUCTION_RELEASE_READINESS.manifest.paymentActivation).toBe(false);
  });

  it("4. supplier remains disconnected", async () => {
    const center = require("../lib/release/releaseReadinessCenter.js");
    const report = await center.evaluateProductionReleaseReadiness();
    expect(report.PRODUCTION_RELEASE_READINESS.supplier.connected).toBe(false);
    expect(report.PRODUCTION_RELEASE_READINESS.supplier.credentialsConfigured).toBe(false);
  });
});

describe("Part 25 — release safety gate runtime", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("5. safety passes with goLiveApproval lock via runtime", () => {
    const { evaluateReleaseSafety } = require("../lib/release/releaseSafetyGate.js");
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    const result = evaluateReleaseSafety(
      {
        BUZZARD_SALES_ENABLED: "0",
        NEXT_PUBLIC_SALES_ENABLED: "0",
        REAL_SUPPLIER_LIVE_IMPORT: "0",
        REAL_SUPPLIER_DRY_RUN: "1",
      },
      {
        productionSafetyLock: goLiveApproval.PRODUCTION_SAFETY_LOCK,
        supplierOrdersBlocked: true,
        stripeEnabled: false,
        paypalEnabled: false,
      }
    );
    expect(result.status).toBe("PASS");
    expect(result.productionSafetyLock).toBe(true);
  });

  it("6. safety fails when sales enabled", () => {
    const { evaluateReleaseSafety } = require("../lib/release/releaseSafetyGate.js");
    const result = evaluateReleaseSafety({ ...SAFE_ENV, BUZZARD_SALES_ENABLED: "1" });
    expect(result.status).toBe("FAIL");
  });

  it("7. safety fails when live import enabled", () => {
    const { evaluateReleaseSafety } = require("../lib/release/releaseSafetyGate.js");
    const result = evaluateReleaseSafety({ ...SAFE_ENV, REAL_SUPPLIER_LIVE_IMPORT: "1" });
    expect(result.status).toBe("FAIL");
  });
});

describe("Part 25 — rollback and manifest", () => {
  it("8. rollback without previous release is CONDITION", () => {
    const { evaluateRollbackReadiness } = require("../lib/release/releaseRollbackReadiness.js");
    const result = evaluateRollbackReadiness({ previousRelease: null });
    expect(result.ready).toBe(false);
    expect(result.automaticRollback).toBe(false);
  });

  it("9. release manifest is immutable", () => {
    const { buildReleaseManifest } = require("../lib/release/releaseManifest.js");
    const manifest = buildReleaseManifest({ version: "part25", commit: "abc" });
    expect(manifest.immutable).toBe(true);
    expect(manifest.paymentActivation).toBe(false);
  });
});

describe("Part 25 — audit redaction", () => {
  it("10. release audit redacts secrets", () => {
    const { recordReleaseAction } = require("../lib/release/releaseAudit.js");
    const operationsAudit = require("../lib/operations/operationsAudit.js");
    const corrId = `rel_${crypto.randomBytes(4).toString("hex")}`;
    recordReleaseAction(
      { adminUser: { email: "admin@test.de" }, correlationId: corrId },
      { action: "admin.change", metadata: { apiKey: "secret-key" }, dryRun: true }
    );
    const rows = operationsAudit.findByCorrelationId(corrId);
    expect(rows.length).toBe(1);
    expect(JSON.stringify(rows)).not.toContain("secret-key");
  });
});

describe("Part 25 — RBAC", () => {
  it("11. public release health route is public", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/health/release-readiness").public).toBe(true);
  });

  it("12. admin release routes require system.read", () => {
    const { resolveRoutePermission } = require("../lib/routePermissions.js");
    expect(resolveRoutePermission("GET", "/api/admin/release/readiness").permission).toBe("system.read");
    expect(resolveRoutePermission("POST", "/api/admin/release/validate").permission).toBe("system.read");
  });
});

describe("Part 25 — Part 24 regression", () => {
  it("13. Part 24 buildReleaseReadiness still works", () => {
    const { buildReleaseReadiness } = require("../lib/release/releaseReadiness.js");
    const result = buildReleaseReadiness({ tests: { allPassed: true }, env: SAFE_ENV });
    expect(result.autoActivate).toBe(false);
    expect(result.gates.length).toBe(12);
  });

  it("14. version constant is part25", () => {
    const { RELEASE_READINESS_VERSION } = require("../core/releaseReadinessConstants.js");
    expect(RELEASE_READINESS_VERSION).toBe("part25");
  });
});

describe("Part 25 — safety regression", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
    process.env.BUZZARD_STRIPE_ENABLED = "0";
    process.env.BUZZARD_PAYPAL_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    process.env.REAL_SUPPLIER_DRY_RUN = "1";
  });

  it("15. go-live lock active", () => {
    const goLiveApproval = require("../lib/commerce/goLiveApproval.js");
    expect(goLiveApproval.PRODUCTION_SAFETY_LOCK).toBe(true);
  });

  it("16. no supplier credentials", () => {
    delete process.env.REAL_SUPPLIER_API_KEY;
    const status = require("../lib/supplier/realSupplierConnector.js").createConnectorFromEnv().getStatus();
    expect(status.credentialsConfigured).toBe(false);
  });

  it("17. sales OFF in commerce flags", () => {
    const { getEffectiveFlags } = require("../lib/commerce/commerceFeatureFlags.js");
    expect(getEffectiveFlags().salesEnabled).toBe(false);
  });

  it("18. public catalog sales OFF", () => {
    const catalogReadService = require("../lib/storefront/catalogReadService.js");
    expect(catalogReadService.getHealth().salesEnabled).toBe(false);
  });

  it("19. admin safety gate blocks go-live activation", () => {
    const adminSafetyGate = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafetyGate.assertAdminAction("go_live", {
      req: { adminUser: { email: "admin@test.de" } },
      body: { enableSales: true },
    });
    expect(result.ok).toBe(false);
  });

  it("20. fail-closed configuration validation passes with safe env", () => {
    const configurationValidation = require("../lib/operations/configurationValidation.js");
    const config = configurationValidation.validateConfiguration();
    expect(config.ok).toBe(true);
  });
});
