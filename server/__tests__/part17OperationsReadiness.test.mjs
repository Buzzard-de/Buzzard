import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);

describe("Part 17 — job lifecycle", () => {
  it("1. maps job statuses to operations labels", () => {
    const { mapJobStatus, OPERATIONS_STATUS } = require("../core/operationsConstants.js");
    expect(mapJobStatus("QUEUED")).toBe(OPERATIONS_STATUS.PENDING);
    expect(mapJobStatus("COMPLETED")).toBe(OPERATIONS_STATUS.SUCCESS);
    expect(mapJobStatus("DEAD_LETTER")).toBe(OPERATIONS_STATUS.PERMANENTLY_FAILED);
  });

  it("2. idempotency prevents duplicate operation", () => {
    const idempotency = require("../lib/operations/jobIdempotency.js");
    const key = `test-${crypto.randomBytes(4).toString("hex")}`;
    const first = idempotency.beginOperation({ operation: "BACKUP", scope: "test", idempotencyKey: key });
    expect(first.ok).toBe(true);
    idempotency.completeOperation(first.idempotencyKey, { result: { ok: true } });
    const second = idempotency.beginOperation({ operation: "BACKUP", scope: "test", idempotencyKey: key });
    expect(second.ok).toBe(false);
    expect(second.code).toBe("already_completed");
  });
});

describe("Part 17 — retry and failure", () => {
  it("3. retry policy computes backoff", () => {
    const retry = require("../lib/operations/jobRetryPolicy.js");
    expect(retry.computeBackoffMs(0)).toBe(1000);
    expect(retry.computeBackoffMs(3)).toBe(8000);
  });

  it("4. permanent failure after max retries", () => {
    const retry = require("../lib/operations/jobRetryPolicy.js");
    const { OPERATIONS_STATUS } = require("../core/operationsConstants.js");
    const result = retry.resolveFailureStatus({ retryCount: 3, maxRetries: 3, failureKind: "TIMEOUT" });
    expect(result.opsStatus).toBe(OPERATIONS_STATUS.PERMANENTLY_FAILED);
    expect(result.permanent).toBe(true);
  });
});

describe("Part 17 — audit and correlation", () => {
  it("5. records audit without secrets", () => {
    const audit = require("../lib/operations/operationsAudit.js");
    const corrId = `corr_${crypto.randomBytes(4).toString("hex")}`;
    audit.recordAudit({
      actor: "test@buzzard.de",
      action: "product.import",
      resource: "import",
      resourceId: "imp_test",
      result: "dry_run",
      correlationId: corrId,
      metadata: { apiKey: "super-secret-should-redact" },
    });
    const listed = audit.findByCorrelationId(corrId);
    expect(listed.length).toBe(1);
    expect(listed[0].metadata.apiKey).toBe("[redacted]");
    expect(JSON.stringify(listed)).not.toContain("super-secret-should-redact");
  });

  it("6. correlation context links request and job", () => {
    const correlation = require("../lib/operations/correlationContext.js");
    const ctx = correlation.createContext();
    expect(ctx.requestId).toMatch(/^req_/);
    expect(ctx.correlationId).toMatch(/^corr_/);
    correlation.bindJob(ctx.requestId, "job_abc");
    const loaded = correlation.getContext(ctx.requestId);
    expect(loaded.jobId).toBe("job_abc");
  });
});

describe("Part 17 — admin and go-live safety", () => {
  beforeEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("7. blocks sales activation attempt", () => {
    const adminSafety = require("../lib/operations/adminSafetyGate.js");
    const result = adminSafety.assertAdminAction("sales_config", {
      body: { enableSales: true },
      req: { adminUser: { email: "admin@test.de" }, correlationId: "c1", requestId: "r1" },
    });
    expect(result.ok).toBe(false);
  });

  it("8. go-live readiness is diagnostic only", async () => {
    const goLive = require("../lib/operations/goLiveReadiness.js");
    const readiness = await goLive.evaluateGoLiveReadiness();
    expect(readiness.diagnosticOnly).toBe(true);
    expect(readiness.autoActivate).toBe(false);
    expect(readiness.gates.length).toBe(12);
    const salesGate = readiness.gates.find((g) => g.gate === "SALES");
    expect(salesGate.status).toBe("PASS");
  });
});

describe("Part 17 — catalog, price, stock", () => {
  it("9. catalog readiness accepts zero public products", () => {
    const catalog = require("../lib/operations/catalogReadiness.js");
    const result = catalog.evaluateCatalogReadiness();
    expect(result.overall).not.toBe("FAIL");
    expect(result.note).toMatch(/zero public products|0 expected/i);
  });

  it("10. price engine is deterministic", () => {
    const priceEngine = require("../lib/operations/priceEngine.js");
    const a = priceEngine.calculateSellingPrice({ supplierNetPrice: 100, targetMargin: 0.3 });
    const b = priceEngine.calculateSellingPrice({ supplierNetPrice: 100, targetMargin: 0.3 });
    expect(a.sellingPrice).toBe(b.sellingPrice);
    expect(a.autoPublish).toBe(false);
  });

  it("11. stock engine derives statuses", () => {
    const stockEngine = require("../lib/operations/stockEngine.js");
    expect(stockEngine.deriveStockStatus(10).status).toBe("IN_STOCK");
    expect(stockEngine.deriveStockStatus(0).status).toBe("OUT_OF_STOCK");
    expect(stockEngine.deriveStockStatus(-1).blocked).toBe(true);
  });
});

describe("Part 17 — backup and restore safety", () => {
  it("12. backup readiness returns structured status", () => {
    const backup = require("../lib/backupAutomation.js");
    const readiness = backup.getBackupReadiness();
    expect(readiness).toHaveProperty("backupDir");
  });

  it("13. restore requires explicit production approval", () => {
    const restoreSafety = require("../lib/operations/restoreSafety.js");
    const plan = restoreSafety.reviewRestorePlan({
      sourcePath: "/tmp/nonexistent-backup.db",
      targetPath: "/var/data/buzzard.db",
      environment: "production",
    });
    expect(plan.autoRestore).toBe(false);
    expect(plan.allowed).toBe(false);
  });
});

describe("Part 17 — configuration and supplier safety", () => {
  afterEach(() => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
    delete process.env.REAL_SUPPLIER_API_KEY;
  });

  it("14. configuration fails closed on sales+lock", () => {
    process.env.BUZZARD_SALES_ENABLED = "1";
    const config = require("../lib/operations/configurationValidation.js");
    const result = config.validateConfiguration();
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === "sales_with_go_live_lock")).toBe(true);
    process.env.BUZZARD_SALES_ENABLED = "0";
  });

  it("15. live import without credentials fails closed", () => {
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "1";
    delete process.env.REAL_SUPPLIER_API_KEY;
    delete process.env.REAL_SUPPLIER_API_URL;
    delete process.env.REAL_SUPPLIER_CODE;
    const config = require("../lib/operations/configurationValidation.js");
    const result = config.validateConfiguration();
    expect(result.errors.some((e) => e.code === "live_import_without_credentials")).toBe(true);
    process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
  });

  it("16. payment safety when sales off", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const flags = require("../lib/commerce/commerceFeatureFlags.js").getEffectiveFlags();
    expect(flags.mockPaymentOnly).toBe(true);
    expect(flags.stripeEnabled).toBe(false);
  });

  it("17. sales safety gate active", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const lifecycle = require("../lib/pim/productLifecycle.js");
    expect(lifecycle.canActivateSales({ status: "ACTIVE" }).ok).toBe(false);
  });

  it("18. no secret exposure in monitoring snapshot", async () => {
    process.env.REAL_SUPPLIER_API_KEY = "top-secret-key";
    const monitoring = require("../lib/operations/monitoringReadiness.js");
    const snapshot = await monitoring.getMonitoringSnapshot();
    expect(snapshot.secretsExposed).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain("top-secret-key");
    delete process.env.REAL_SUPPLIER_API_KEY;
  });
});

describe("Part 17 — operations control", () => {
  it("operations summary includes job safety", () => {
    const control = require("../lib/operations/operationsControl.js");
    const summary = control.getOperationsSummary();
    expect(summary.jobSafety).toBeTruthy();
    expect(summary.statuses).toContain("BLOCKED");
  });
});
