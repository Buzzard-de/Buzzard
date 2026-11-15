import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-automation-sync-block-"));
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
process.env.BUZZARD_AUDIT_DIR = tempDir;

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

const dbCalls = [];
stub(require.resolve("../lib/db.js"), {
  db: {
    prepare(sql) {
      dbCalls.push(String(sql));
      throw new Error("commerce database must stay closed");
    },
    exec() {
      throw new Error("commerce database must stay closed");
    },
    close() {},
  },
  getDatabaseHealth() {
    return { ok: false, mocked: true };
  },
});

stub(require.resolve("../lib/auth.js"), {
  requireAuth(req, res) {
    if (!req.adminUser?.role) {
      res.status(401).json({ success: false, errorKey: "admin.auth.required" });
      return null;
    }
    return req.adminUser;
  },
});

const historicalJobs = [
  { id: "job_historical_sync", jobType: "PRODUCT_SYNC", status: "COMPLETED" },
];
const queueCalls = { enqueue: 0, list: 0, retry: 0, cancel: 0 };
stub(require.resolve("../lib/jobQueue.js"), {
  enqueueJob() {
    queueCalls.enqueue += 1;
    throw new Error("legacy sync must not enqueue");
  },
  listJobs() {
    queueCalls.list += 1;
    return historicalJobs.slice();
  },
  countJobsByStatus() {
    return { COMPLETED: 1 };
  },
  getJob() {
    return null;
  },
  retryJob() {
    queueCalls.retry += 1;
    throw new Error("retry must stay unchanged");
  },
  cancelJob() {
    queueCalls.cancel += 1;
    throw new Error("cancel must stay unchanged");
  },
});

stub(require.resolve("../lib/jobWorker.js"), {
  getWorkerState() {
    return { status: "STOPPED" };
  },
  startWorker() {
    throw new Error("worker must not start");
  },
});
stub(require.resolve("../lib/jobScheduler.js"), {
  listSchedules() {
    return [];
  },
  tickScheduler() {
    throw new Error("scheduler must not tick");
  },
  createSchedule() {
    throw new Error("schedule create must stay blocked");
  },
});
stub(require.resolve("../lib/jobObservability.js"), { listJobLogs() { return []; } });
stub(require.resolve("../lib/integrationHealth.js"), { listAllHealth() { return []; } });
stub(require.resolve("../lib/supplier/adapterRegistry.js"), { listAdapters() { return []; } });
stub(require.resolve("../lib/categoryReadiness.js"), {});

const plugin = require("../plugins/automationPlugin.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
  delete(route, handler) { routes[`DELETE ${route}`] = handler; },
});

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function syncReq(kind, body, headers = {}) {
  return {
    body,
    headers,
    query: {},
    params: { kind },
    url: `/api/admin/automation/sync/${kind}`,
    adminUser: {
      userId: "synthetic-catalog",
      role: "catalog_manager",
      email: "catalog@example.com",
      name: "Synthetic",
    },
  };
}

function postSync(kind, body, headers) {
  const res = mockRes();
  routes["POST /api/admin/automation/sync/:kind"](syncReq(kind, body, headers), res);
  return res;
}

function expectBlocked(res) {
  expect(res.statusCode).toBe(403);
  expect(res.body.success).toBe(false);
  expect(res.body.errorCode).toBe("LEGACY_AUTOMATION_SYNC_BLOCKED");
  expect(res.body.queued).toBe(false);
  expect(res.body.executed).toBe(false);
  expect(res.body.salesOpen).toBe(false);
  expect(res.body.egressAllowed).toBe(false);
  expect(res.body.productionReady).toBe(false);
  expect(res.body.job).toBeUndefined();
}

afterAll(() => {
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

describe("legacy automation sync enqueue block", () => {
  it("rejects known sync kinds before the queue", () => {
    expectBlocked(postSync("product", {
      dryRun: false,
      priority: "CRITICAL",
      idempotencyKey: "product-must-not-store",
    }, { "idempotency-key": "product-header-must-not-store" }));
    expectBlocked(postSync("price", { dryRun: false, idempotencyKey: "price-must-not-store" }));
    expectBlocked(postSync("stock", { dryRun: true, payload: { live: true } }));
    expectBlocked(postSync("supplier", {}));
  });

  it("rejects an unknown kind without queueing", () => {
    expectBlocked(postSync("order", {
      dryRun: false,
      idempotencyKey: "unknown-must-not-store",
    }, { "idempotency-key": "unknown-header-must-not-store" }));
    expectBlocked(postSync("'; DROP TABLE core_background_jobs;--", { live: true }));
  });

  it("does not enqueue, write the database, or store idempotency and audit", () => {
    expect(queueCalls).toEqual({ enqueue: 0, list: 0, retry: 0, cancel: 0 });
    expect(dbCalls).toEqual([]);
    expect(fs.readdirSync(tempDir)).toEqual([]);
    expect(historicalJobs).toEqual([
      { id: "job_historical_sync", jobType: "PRODUCT_SYNC", status: "COMPLETED" },
    ]);
  });

  it("keeps the job list readable", () => {
    const res = mockRes();
    routes["GET /api/admin/automation/jobs"]({
      ...syncReq("product", {}),
      query: { status: "COMPLETED", limit: "10" },
      adminUser: {
        userId: "synthetic-admin",
        role: "admin",
        email: "admin@example.com",
        name: "Synthetic",
      },
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobs).toEqual(historicalJobs);
    expect(res.body.counts).toEqual({ COMPLETED: 1 });
    expect(queueCalls.list).toBe(1);
    expect(queueCalls.enqueue).toBe(0);
    expect(dbCalls).toEqual([]);
  });

  it("leaves the commerce database and sales switch untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
