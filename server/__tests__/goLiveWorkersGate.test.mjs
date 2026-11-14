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
const calls = { startWorker: 0, tickScheduler: 0, enqueueJob: 0 };

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

let workerFixture = {};

stub("../lib/db.js", {
  getDatabaseHealth() {
    return { enabled: true, path: "synthetic", persistence: { persistent: true } };
  },
});
stub("../lib/dbIntegrity.js", {
  runIntegrityCheck() {
    return { status: "OK" };
  },
});
stub("../lib/backupAutomation.js", {
  getBackupReadiness() {
    return { latestValid: true, dirExists: true, latestStatus: "synthetic" };
  },
});
stub("../lib/storefront/catalogReadService.js", {
  getHealth() {
    return { productCount: 0, salesEnabled: false };
  },
});
stub("../lib/commerce/commerceFeatureFlags.js", {
  getEffectiveFlags() {
    return {
      salesEnabled: false,
      paymentEnabled: false,
      mockPaymentOnly: true,
      stripeEnabled: false,
      paypalEnabled: false,
    };
  },
});
stub("../lib/commerce/goLiveApproval.js", {
  PRODUCTION_SAFETY_LOCK: true,
});
stub("../lib/productionHealth.js", {
  async getRedisHealth() {
    return { configured: false, ok: false, status: "NOT_CONFIGURED", backend: "memory" };
  },
  getWorkerHealth() {
    return {
      enabled: false,
      autoStart: false,
      status: "UNKNOWN",
      runtimeVerified: false,
      storedStatus: null,
      queue: { queued: 0 },
      ...workerFixture,
    };
  },
  startWorker() {
    calls.startWorker += 1;
    throw new Error("worker must not start");
  },
});
stub("../lib/supplier/realSupplierConnector.js", {
  createConnectorFromEnv() {
    return { getStatus: () => ({ credentialsConfigured: false }) };
  },
  isLiveImportEnabled() {
    return false;
  },
});
stub("../lib/operations/configurationValidation.js", {
  validateConfiguration() {
    return { ok: true, errors: [] };
  },
});
stub("../lib/pim/productStagingService.js", {
  getStagingStats() {
    return {};
  },
});
stub("../lib/jobWorker.js", {
  startWorker() {
    calls.startWorker += 1;
    throw new Error("worker must not start");
  },
  getWorkerState() {
    throw new Error("stored worker state must not be read by this test");
  },
});
stub("../lib/jobScheduler.js", {
  tickScheduler() {
    calls.tickScheduler += 1;
    throw new Error("scheduler must not tick");
  },
});
stub("../lib/jobQueue.js", {
  enqueueJob() {
    calls.enqueueJob += 1;
    throw new Error("queue must stay closed");
  },
});

const goLivePath = require.resolve("../lib/operations/goLiveReadiness.js");
delete require.cache[goLivePath];
const goLive = require("../lib/operations/goLiveReadiness.js");

function workersGate(readiness) {
  return readiness.gates.find((gate) => gate.gate === "WORKERS");
}

async function readWith(fixture) {
  workerFixture = fixture;
  return goLive.evaluateGoLiveReadiness();
}

describe("go-live WORKERS gate", () => {
  it("does not PASS when enabled is true and runtime is unverified", async () => {
    const readiness = await readWith({
      enabled: true,
      status: "UNKNOWN",
      runtimeVerified: false,
      storedStatus: null,
    });
    const workers = workersGate(readiness);
    expect(workers.status).toBe("CONDITION");
    expect(workers.status).not.toBe("PASS");
    expect(readiness.overall).not.toBe("READY");
    expect(readiness.diagnosticOnly).toBe(true);
    expect(readiness.autoActivate).toBe(false);
  });

  it("returns CONDITION when storedStatus is RUNNING and runtimeVerified is false", async () => {
    const readiness = await readWith({
      enabled: true,
      status: "RUNNING",
      runtimeVerified: false,
      storedStatus: "RUNNING",
    });
    const workers = workersGate(readiness);
    expect(workers.status).toBe("CONDITION");
    expect(workers.detail).toContain("storedStatus=RUNNING");
    expect(workers.detail).toContain("runtimeVerified=false");
    expect(readiness.overall).not.toBe("READY");
    expect(readiness.autoActivate).toBe(false);
  });

  it("evaluates UNKNOWN and BLOCKED as unverified conditions", async () => {
    for (const status of ["UNKNOWN", "BLOCKED"]) {
      const readiness = await readWith({
        enabled: true,
        status,
        runtimeVerified: false,
        storedStatus: status,
      });
      const workers = workersGate(readiness);
      expect(workers.status).toBe("CONDITION");
      expect(workers.status).not.toBe("PASS");
      expect(workers.status).not.toBe("FAIL");
      expect(workers.detail).toContain(`status=${status}`);
      expect(readiness.overall).not.toBe("READY");
      expect(readiness.diagnosticOnly).toBe(true);
      expect(readiness.autoActivate).toBe(false);
    }
  });

  it("accepts only verified RUNNING and still refuses activation", async () => {
    const readiness = await readWith({
      enabled: true,
      status: "RUNNING",
      runtimeVerified: true,
      storedStatus: "RUNNING",
    });
    expect(workersGate(readiness).status).toBe("PASS");
    expect(readiness.gates.find((gate) => gate.gate === "SALES").status).toBe("PASS");
    expect(readiness.gates.find((gate) => gate.gate === "PAYMENTS").status).toBe("PASS");
    expect(readiness.autoActivate).toBe(false);
    expect(readiness.diagnosticOnly).toBe(true);
    expect(readiness.overall).not.toBe("READY");
    expect(calls).toEqual({ startWorker: 0, tickScheduler: 0, enqueueJob: 0 });
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
});
