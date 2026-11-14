import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const previous = {
  worker: process.env.BUZZARD_WORKER_ENABLED,
  scheduler: process.env.BUZZARD_SCHEDULER_ENABLED,
  sales: process.env.BUZZARD_SALES_ENABLED,
  storefront: process.env.BUZZARD_PIM_STOREFRONT,
};

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
process.env.BUZZARD_PIM_STOREFRONT = "0";

let storedWorkerStatus = "RUNNING";

function stub(resolved, exports) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

stub(require.resolve("../lib/db.js"), {
  db: {
    prepare(sql) {
      const text = String(sql);
      if (text.includes("core_worker_state")) {
        return { get: () => ({ status: storedWorkerStatus }) };
      }
      return {
        get: () => ({ n: 0 }),
        all: () => [],
      };
    },
  },
  getDatabaseHealth() {
    return { ok: true };
  },
});

const readiness = require("../lib/commerce/commerceReadiness.js");

function setEnv(name, value, present) {
  if (!present) delete process.env[name];
  else process.env[name] = value;
}

afterAll(() => {
  for (const [name, key] of [
    ["BUZZARD_WORKER_ENABLED", "worker"],
    ["BUZZARD_SCHEDULER_ENABLED", "scheduler"],
    ["BUZZARD_SALES_ENABLED", "sales"],
    ["BUZZARD_PIM_STOREFRONT", "storefront"],
  ]) {
    if (previous[key] === undefined) delete process.env[name];
    else process.env[name] = previous[key];
  }
});

describe("commerce readiness worker and scheduler reporting", () => {
  it("does not show the worker or scheduler as running for missing, empty, or explicit settings", () => {
    const samples = [
      [false, undefined],
      [true, ""],
      [true, "1"],
      [true, "true"],
      [true, "on"],
    ];
    for (const [present, value] of samples) {
      setEnv("BUZZARD_WORKER_ENABLED", value, present);
      setEnv("BUZZARD_SCHEDULER_ENABLED", value, present);
      storedWorkerStatus = "RUNNING";
      const health = readiness.getCommerceHealth();
      expect(health.worker).toBe("BLOCKED");
      expect(health.scheduler).toBe("BLOCKED");
      expect(health.workerRuntime.verified).toBe(false);
      expect(health.schedulerRuntime.verified).toBe(false);
      expect(health.workerRuntime.storedStatus).toBe("RUNNING");
      expect(health.workerRuntime.storedStatusIsProof).toBe(false);
      expect(health.workerRuntime.status).not.toBe("RUNNING");
      expect(health.schedulerRuntime.status).not.toBe("RUNNING");
      expect(health.workerConfiguration.honored).toBe(false);
      expect(health.schedulerConfiguration.honored).toBe(false);
      expect(health.workerConfiguration.autoStart).toBe(false);
      expect(health.schedulerConfiguration.autoStart).toBe(false);
      expect(health.workerConfiguration.requested).toBe(present ? value : null);
      expect(health.schedulerConfiguration.requested).toBe(present ? value : null);
    }
  });

  it("keeps the sales and payment blocks", () => {
    setEnv("BUZZARD_WORKER_ENABLED", "1", true);
    setEnv("BUZZARD_SCHEDULER_ENABLED", "1", true);
    const health = readiness.getCommerceHealth();
    const gate = readiness.runReadinessGate();
    expect(health.sales.salesEnabled).toBe(false);
    expect(health.sales.catalogMode).toBe(true);
    expect(health.featureFlags.salesEnabled).toBe(false);
    expect(health.featureFlags.paymentEnabled).toBe(false);
    expect(health.featureFlags.supplierOrdersEnabled).toBe(false);
    expect(health.payment.mockPaymentOnly).toBe(true);
    expect(health.payment.realMoneyMovement).toBe(false);
    expect(gate.salesBlocked).toBe(true);
    expect(gate.salesActivationAllowed).toBe(false);
    expect(gate.checks.find((item) => item.name === "SALES_GATE").status).toBe("PASS");
    expect(gate.checks.find((item) => item.name === "PAYMENT").detail).toMatch(/no real money movement/i);
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("leaves the commerce database untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  });
});
