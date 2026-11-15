import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const previousWorker = process.env.BUZZARD_WORKER_ENABLED;
const previousScheduler = process.env.BUZZARD_SCHEDULER_ENABLED;
const previousSales = process.env.BUZZARD_SALES_ENABLED;

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);

function stub(resolved, exports) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

const calls = { start: 0, tick: 0, enqueue: 0 };
const workerState = { status: "RUNNING", workerId: "worker_stale", jobsProcessed: 4, lastTickAt: "2020-01-01T00:00:00.000Z" };
let queueThrows = false;
let schedules = [{ id: "sched_1", name: "kept", enabled: true, nextRunAt: "2030-01-01T00:00:00.000Z" }];
let schedulesThrow = false;

stub(require.resolve("../lib/db.js"), {
  db: {
    prepare() {
      if (queueThrows) throw new Error("queue unavailable");
      return { get: () => ({ n: 0 }) };
    },
  },
  getDatabaseHealth() {
    return { ok: false, mocked: true };
  },
});
stub(require.resolve("../lib/jobWorker.js"), {
  getWorkerState() {
    return { ...workerState };
  },
  startWorker() {
    calls.start += 1;
    throw new Error("worker must not start");
  },
});
stub(require.resolve("../lib/jobScheduler.js"), {
  listSchedules() {
    if (schedulesThrow) throw new Error("schedules unavailable");
    return schedules.map((row) => ({ ...row }));
  },
  tickScheduler() {
    calls.tick += 1;
    throw new Error("scheduler must not tick");
  },
});
stub(require.resolve("../lib/jobQueue.js"), {
  enqueueJob() {
    calls.enqueue += 1;
    throw new Error("queue must stay closed");
  },
});

const health = require("../lib/productionHealth.js");

function setWorkerEnv(value, present = true) {
  if (!present) delete process.env.BUZZARD_WORKER_ENABLED;
  else process.env.BUZZARD_WORKER_ENABLED = value;
}

afterAll(() => {
  if (previousWorker === undefined) delete process.env.BUZZARD_WORKER_ENABLED;
  else process.env.BUZZARD_WORKER_ENABLED = previousWorker;
  if (previousScheduler === undefined) delete process.env.BUZZARD_SCHEDULER_ENABLED;
  else process.env.BUZZARD_SCHEDULER_ENABLED = previousScheduler;
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
});

describe("production health worker and scheduler reporting", () => {
  it("does not treat the worker environment variable as a running worker", () => {
    const samples = [
      [false, undefined],
      [true, ""],
      [true, "1"],
      [true, "true"],
      [true, "yes"],
      [true, "on"],
      [true, "enabled"],
    ];
    for (const [present, value] of samples) {
      setWorkerEnv(value, present);
      workerState.status = "RUNNING";
      const report = health.getWorkerHealth();
      expect(report.enabled).toBe(false);
      expect(report.autoStart).toBe(false);
      expect(report.status).toBe("UNKNOWN");
      expect(report.status).not.toBe("RUNNING");
      expect(report.runtimeVerified).toBe(false);
      expect(report.storedStatus).toBe("RUNNING");
      expect(report.configurationIntent.honored).toBe(false);
      expect(report.configurationIntent.autoStart).toBe(false);
      expect(report.configurationIntent.requested).toBe(present ? value : null);
      expect(report.supplierOrdersBlocked).toBe(true);
    }
    expect(calls).toEqual({ start: 0, tick: 0, enqueue: 0 });
  });

  it("reports a verified non-running worker state and unknown when the read fails", () => {
    setWorkerEnv("1");
    workerState.status = "STOPPED";
    expect(health.getWorkerHealth().status).toBe("STOPPED");
    workerState.status = "PAUSED";
    expect(health.getWorkerHealth().status).toBe("PAUSED");
    workerState.status = "RUNNING";
    queueThrows = true;
    const failed = health.getWorkerHealth();
    expect(failed.status).toBe("UNKNOWN");
    expect(failed.queue).toBe(null);
    expect(failed.enabled).toBe(false);
    queueThrows = false;
    expect(calls.start).toBe(0);
  });

  it("does not report the scheduler as running from schedule rows or an environment value", () => {
    process.env.BUZZARD_SCHEDULER_ENABLED = "1";
    const listed = health.getSchedulerHealth();
    expect(listed.enabled).toBe(false);
    expect(listed.autoStart).toBe(false);
    expect(listed.status).toBe("UNKNOWN");
    expect(listed.runtimeVerified).toBe(false);
    expect(listed.configurationIntent.honored).toBe(false);
    expect(listed.configurationIntent.requested).toBe("1");
    expect(listed.total).toBe(1);
    expect(listed.enabledCount).toBe(1);
    schedulesThrow = true;
    const failed = health.getSchedulerHealth();
    expect(failed.status).toBe("UNKNOWN");
    expect(failed.enabled).toBe(false);
    expect(failed.total).toBe(null);
    expect(calls).toEqual({ start: 0, tick: 0, enqueue: 0 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("leaves the commerce database untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  });
});
