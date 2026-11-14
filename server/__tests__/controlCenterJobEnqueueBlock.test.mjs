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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-job-block-"));
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
process.env.BUZZARD_AUDIT_DIR = tempDir;

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);

const dbResolved = require.resolve("../lib/db.js");
const dbCalls = [];
require.cache[dbResolved] = {
  id: dbResolved,
  filename: dbResolved,
  loaded: true,
  exports: {
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
  },
};

const queueCalls = { enqueue: 0, list: 0 };
const jobQueueResolved = require.resolve("../lib/jobQueue.js");
require.cache[jobQueueResolved] = {
  id: jobQueueResolved,
  filename: jobQueueResolved,
  loaded: true,
  exports: {
    enqueueJob() {
      queueCalls.enqueue += 1;
      throw new Error("legacy enqueue must not run");
    },
    listJobs() {
      queueCalls.list += 1;
      return [{ id: "job_historical", jobType: "SYSTEM_HEALTH", status: "COMPLETED" }];
    },
  },
};

const { createControlCenterHandlers } = require("../plugins/controlCenterPlugin.js");

const routes = {};
createControlCenterHandlers({
  facade: { async dispatch() { throw new Error("facade must stay unused"); } },
  readers: {},
}).register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
  patch(route, handler) { routes[`PATCH ${route}`] = handler; },
  put(route, handler) { routes[`PUT ${route}`] = handler; },
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

function adminReq(body, headers = {}) {
  return {
    body,
    headers,
    query: {},
    url: "/api/admin/control-center/jobs",
    adminUser: {
      userId: "synthetic-admin",
      role: "admin",
      email: "admin@example.com",
      name: "Synthetic",
    },
  };
}

async function postJob(body, headers) {
  const res = mockRes();
  await routes["POST /api/admin/control-center/jobs"](adminReq(body, headers), res);
  return res;
}

function expectBlocked(res) {
  expect(res.statusCode).toBe(403);
  expect(res.body.success).toBe(false);
  expect(res.body.errorCode).toBe("LEGACY_JOB_ENQUEUE_BLOCKED");
  expect(res.body.queued).toBe(false);
  expect(res.body.executed).toBe(false);
  expect(res.body.salesOpen).toBe(false);
  expect(res.body.egressAllowed).toBe(false);
  expect(res.body.productionReady).toBe(false);
  expect(res.body.purchased).toBe(false);
  expect(res.body.moneyMoved).toBe(false);
  expect(res.body.job).toBeUndefined();
}

afterAll(() => {
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

describe("legacy control-center job enqueue block", () => {
  it("rejects an ordinary job type before the queue", async () => {
    expectBlocked(await postJob({ jobType: "manual", payload: { note: "synthetic" }, priority: "NORMAL" }));
    expectBlocked(await postJob({ jobType: "SYSTEM_HEALTH", payload: { dryRun: false } }));
    expectBlocked(await postJob({}));
  });

  it("rejects PRODUCT_IMPORT and PRODUCT_MAPPING with executable payloads", async () => {
    expectBlocked(await postJob({
      jobType: "PRODUCT_IMPORT",
      payload: { dryRun: false, raw: { sku: "SYNTH-1" } },
      idempotencyKey: "import-key-should-not-store",
    }, { "idempotency-key": "import-header-should-not-store" }));
    expectBlocked(await postJob({
      jobType: "PRODUCT_MAPPING",
      payload: { dryRun: false, supplierId: "mock", supplierSku: "SYNTH-1", internalSku: "SYNTH-1" },
      priority: "CRITICAL",
      maxRetries: 5,
    }));
  });

  it("does not write a job, an idempotency row, or an audit file", () => {
    expect(queueCalls.enqueue).toBe(0);
    expect(dbCalls).toEqual([]);
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it("keeps the job list readable", async () => {
    const res = mockRes();
    await routes["GET /api/admin/control-center/jobs"]({
      ...adminReq({}),
      query: { status: "COMPLETED", limit: "10" },
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobs).toEqual([
      { id: "job_historical", jobType: "SYSTEM_HEALTH", status: "COMPLETED" },
    ]);
    expect(queueCalls.list).toBe(1);
    expect(queueCalls.enqueue).toBe(0);
  });

  it("leaves the commerce database and sales switch untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
