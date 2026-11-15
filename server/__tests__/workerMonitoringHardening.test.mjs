import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const calls = { startWorker: 0, tickScheduler: 0 };
const previousEnv = {
  sales: process.env.BUZZARD_SALES_ENABLED,
  publicSales: process.env.NEXT_PUBLIC_SALES_ENABLED,
  dryRun: process.env.REAL_SUPPLIER_DRY_RUN,
  liveImport: process.env.REAL_SUPPLIER_LIVE_IMPORT,
  lock: process.env.PRODUCTION_SAFETY_LOCK,
};

process.env.BUZZARD_SALES_ENABLED = "0";
process.env.NEXT_PUBLIC_SALES_ENABLED = "0";
process.env.REAL_SUPPLIER_DRY_RUN = "1";
process.env.REAL_SUPPLIER_LIVE_IMPORT = "0";
process.env.PRODUCTION_SAFETY_LOCK = "true";

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

let workers = {};
let flags = {
  salesEnabled: false,
  stripeEnabled: false,
  paypalEnabled: false,
  paymentEnabled: false,
  supplierOrdersEnabled: false,
  checkoutEnabled: false,
};

stub("../lib/operations/configurationValidation.js", {
  validateConfiguration() {
    return { ok: true, errors: [], warnings: [] };
  },
});
stub("../lib/commerce/goLiveApproval.js", {
  PRODUCTION_SAFETY_LOCK: true,
});
stub("../lib/commerce/commerceFeatureFlags.js", {
  getEffectiveFlags() {
    return { ...flags };
  },
});
stub("../lib/security/securityReadiness.js", {
  evaluateSecurityReadiness() {
    return {
      SECURITY_READINESS: {
        gates: [
          { gate: "AUTHENTICATION", status: "PASS", detail: "synthetic" },
          { gate: "AUTHORIZATION", status: "PASS", detail: "synthetic" },
          { gate: "API_PROTECTION", status: "PASS", detail: "synthetic" },
        ],
      },
    };
  },
});
stub("../lib/supplier/supplierReadinessCenter.js", {
  evaluateSupplierIntegrationReadiness() {
    return { SUPPLIER_INTEGRATION_READINESS: { overall: "CONDITION" } };
  },
});
stub("../lib/release/releaseReadinessCenter.js", {
  async evaluateProductionReleaseReadiness() {
    return { PRODUCTION_RELEASE_READINESS: { diagnosticOnly: true, status: "CONDITION", gates: [] } };
  },
  buildSafeEnv() {
    return {};
  },
});
stub("../lib/release/releaseRollbackReadiness.js", {
  evaluateRollbackReadiness() {
    return { ready: true, automaticRollback: false };
  },
});
stub("../lib/release/releaseManifest.js", {
  buildReleaseManifest() {
    return { version: "synthetic" };
  },
});
stub("../lib/release/releaseSafetyGate.js", {
  evaluateReleaseSafety() {
    return { status: "PASS", productionSafetyLock: true };
  },
});
stub("../lib/operations/monitoringReadiness.js", {
  async getMonitoringSnapshot() {
    return {
      overall: "OK",
      alerts: [],
      components: {
        db: { status: "OK", persistent: true },
        workers: { ...workers },
      },
    };
  },
});
stub("../lib/operations/incidentReadiness.js", {
  async getIncidentReadiness() {
    return { overall: "OK", incidentCount: 0, enriched: false, incidents: [] };
  },
});
stub("../lib/operations/alertReadiness.js", {
  async getAlertReadiness() {
    return { overall: "OK", ruleCount: 0, activeRules: [] };
  },
});
stub("../lib/backupAutomation.js", {
  getBackupReadiness() {
    return { latestValid: true, dirExists: true, latestStatus: "synthetic" };
  },
});
stub("../lib/pim/productQualityReadinessCenter.js", {
  evaluateProductQualityReadiness() {
    return { PRODUCT_QUALITY_READINESS: { overall: "CONDITION" } };
  },
});
stub("../lib/storefront/catalogReadService.js", {
  getHealth() {
    return { productCount: 0, salesEnabled: false };
  },
});
stub("../lib/supplier/realSupplierConnector.js", {
  createConnectorFromEnv() {
    return {
      getStatus() {
        return { credentialsConfigured: false, liveImportEnabled: false, dryRun: true };
      },
    };
  },
  redactSecrets(value) {
    return value;
  },
});
stub("../lib/deploymentIdentity.js", {
  getDeploymentIdentity() {
    return { commit: "synthetic", commitFull: "synthetic", branch: "test", environment: "test" };
  },
});
stub("../lib/operations/operationsControl.js", {
  getOperationsSummary() {
    return { jobs: { FAILED: 1, PERMANENTLY_FAILED: 0 } };
  },
});
stub("../lib/operations/operationsAudit.js", {
  listAudit() {
    return [];
  },
});
stub("../lib/jobWorker.js", {
  startWorker() {
    calls.startWorker += 1;
    throw new Error("worker must not start");
  },
});
stub("../lib/jobScheduler.js", {
  tickScheduler() {
    calls.tickScheduler += 1;
    throw new Error("scheduler must not tick");
  },
});
stub("../lib/db.js", {
  getDatabaseHealth() {
    throw new Error("live database must not be read");
  },
});

const hardeningPath = require.resolve("../lib/release/finalProductionHardening.js");
delete require.cache[hardeningPath];
const hardening = require("../lib/release/finalProductionHardening.js");

function workerGate(report) {
  return report.FINAL_PRODUCTION_HARDENING.gates.find((gate) => gate.name === "workerReadiness");
}

function otherGates(report) {
  return report.FINAL_PRODUCTION_HARDENING.gates
    .filter((gate) => gate.name !== "workerReadiness")
    .map((gate) => ({ name: gate.name, status: gate.status, detail: gate.detail }));
}

async function evaluate(nextWorkers) {
  workers = nextWorkers;
  return hardening.evaluateFinalProductionHardening();
}

describe("worker monitoring hardening", () => {
  it("does not PASS when healthy is missing or invalid", async () => {
    const report = await evaluate({ status: "RUNNING", runtimeVerified: true });
    const gate = workerGate(report);
    expect(gate.status).not.toBe("PASS");
    expect(gate.status).toBe("CONDITION");
    expect(gate.detail).toContain("healthy=missing");
    const invalid = await evaluate({ healthy: "yes", status: "RUNNING", runtimeVerified: true });
    expect(workerGate(invalid).status).toBe("CONDITION");
    expect(report.FINAL_PRODUCTION_HARDENING.autoActivate).toBe(false);
    expect(report.FINAL_PRODUCTION_HARDENING.decision.ready).toBe(false);
    expect(report.FINAL_PRODUCTION_HARDENING.decision.salesEnabled).toBe(false);
  });

  it("does not PASS when healthy is false even if RUNNING is verified", async () => {
    const report = await evaluate({ healthy: false, status: "RUNNING", runtimeVerified: true });
    const gate = workerGate(report);
    expect(gate.status).not.toBe("PASS");
    expect(gate.status).toBe("CONDITION");
    expect(gate.detail).toContain("healthy=false");
  });

  it("does not PASS when healthy is true but runtime is unverified", async () => {
    const report = await evaluate({ healthy: true, status: "STOPPED", runtimeVerified: false });
    expect(workerGate(report).status).toBe("CONDITION");
    expect(workerGate(report).status).not.toBe("PASS");
  });

  it("does not PASS an unverified RUNNING status", async () => {
    const report = await evaluate({ healthy: true, status: "RUNNING", runtimeVerified: false });
    const gate = workerGate(report);
    expect(gate.status).toBe("CONDITION");
    expect(gate.detail).toContain("worker=RUNNING");
    expect(gate.detail).toContain("runtimeVerified=false");
  });

  it("reports UNKNOWN and BLOCKED worker states as CONDITION", async () => {
    for (const status of ["UNKNOWN", "BLOCKED"]) {
      const report = await evaluate({ healthy: true, status, runtimeVerified: false });
      const gate = workerGate(report);
      expect(gate.status).toBe("CONDITION");
      expect(gate.status).not.toBe("PASS");
      expect(gate.status).not.toBe("BLOCKED");
      expect(gate.detail).toContain(`worker=${status}`);
    }
  });

  it("keeps PASS for verified RUNNING and leaves the other gates unchanged", async () => {
    const verified = await evaluate({ healthy: true, status: "RUNNING", runtimeVerified: true });
    const closed = await evaluate({ status: "UNKNOWN", runtimeVerified: false });
    expect(workerGate(verified).status).toBe("PASS");
    expect(workerGate(verified).failedJobs).toBe(1);
    expect(otherGates(verified)).toEqual(otherGates(closed));
    const byName = Object.fromEntries(otherGates(verified).map((gate) => [gate.name, gate.status]));
    expect(byName.databaseReadiness).toBe("PASS");
    expect(byName.monitoring).toBe("PASS");
    expect(byName.paymentReadiness).toBe("PASS");
    expect(byName.commerceReadiness).toBe("PASS");
    expect(byName.goLiveApproval).toBe("BLOCKED");
    expect(verified.FINAL_PRODUCTION_HARDENING.decision.status).toBe("BLOCKED");
    expect(verified.FINAL_PRODUCTION_HARDENING.decision.autoActivate).toBe(false);
  });

  it("keeps a verified commerce block independent of the worker", async () => {
    flags = { ...flags, salesEnabled: true };
    const report = await evaluate({ healthy: true, status: "RUNNING", runtimeVerified: true });
    flags = { ...flags, salesEnabled: false };
    const commerce = report.FINAL_PRODUCTION_HARDENING.gates.find((gate) => gate.name === "commerceReadiness");
    expect(workerGate(report).status).toBe("PASS");
    expect(commerce.status).toBe("BLOCKED");
    expect(report.FINAL_PRODUCTION_HARDENING.decision.status).toBe("BLOCKED");
    expect(report.FINAL_PRODUCTION_HARDENING.decision.salesEnabled).toBe(true);
    expect(report.FINAL_PRODUCTION_HARDENING.decision.ready).toBe(false);
  });
});

afterAll(() => {
  expect(calls).toEqual({ startWorker: 0, tickScheduler: 0 });
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  if (previousEnv.sales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousEnv.sales;
  if (previousEnv.publicSales === undefined) delete process.env.NEXT_PUBLIC_SALES_ENABLED;
  else process.env.NEXT_PUBLIC_SALES_ENABLED = previousEnv.publicSales;
  if (previousEnv.dryRun === undefined) delete process.env.REAL_SUPPLIER_DRY_RUN;
  else process.env.REAL_SUPPLIER_DRY_RUN = previousEnv.dryRun;
  if (previousEnv.liveImport === undefined) delete process.env.REAL_SUPPLIER_LIVE_IMPORT;
  else process.env.REAL_SUPPLIER_LIVE_IMPORT = previousEnv.liveImport;
  if (previousEnv.lock === undefined) delete process.env.PRODUCTION_SAFETY_LOCK;
  else process.env.PRODUCTION_SAFETY_LOCK = previousEnv.lock;
});
