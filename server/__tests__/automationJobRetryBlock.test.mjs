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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-automation-retry-block-"));
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

const failedJob = {
  id: "job_failed",
  jobType: "PRODUCT_IMPORT",
  status: "FAILED",
  retryCount: 2,
};
const calls = { retry: 0, enqueue: 0, list: 0, worker: 0 };

stub(require.resolve("../lib/jobQueue.js"), {
  getJob(id) {
    if (id === failedJob.id) return failedJob;
    return null;
  },
  retryJob() {
    calls.retry += 1;
    throw new Error("retry must not run");
  },
  enqueueJob() {
    calls.enqueue += 1;
    throw new Error("enqueue must not run");
  },
  listJobs() {
    calls.list += 1;
    return [{ id: "job_historical", jobType: "SYSTEM_HEALTH", status: "COMPLETED" }];
  },
  countJobsByStatus() {
    return { FAILED: 1, COMPLETED: 1 };
  },
});

stub(require.resolve("../lib/jobWorker.js"), {
  getWorkerState() {
    return { status: "STOPPED" };
  },
  startWorker() {
    calls.worker += 1;
    throw new Error("worker must not start");
  },
});
stub(require.resolve("../lib/jobScheduler.js"), {});
stub(require.resolve("../lib/jobObservability.js"), { listJobLogs() { return []; } });
stub(require.resolve("../lib/integrationHealth.js"), {});
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

function adminReq(id) {
  return {
    body: { idempotencyKey: "retry-must-not-store", jobType: "PRODUCT_MAPPING", payload: { dryRun: false } },
    headers: { "idempotency-key": "retry-header-must-not-store" },
    query: {},
    params: { id },
    url: `/api/admin/automation/jobs/${id}/retry`,
    adminUser: {
      userId: "synthetic-admin",
      role: "admin",
      email: "admin@example.com",
      name: "Synthetic",
    },
  };
}

afterAll(() => {
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

describe("legacy automation job retry block", () => {
  it("rejects a failed job before it can be queued again", () => {
    const res = mockRes();
    routes["POST /api/admin/automation/jobs/:id/retry"](adminReq(failedJob.id), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe("LEGACY_JOB_ENQUEUE_BLOCKED");
    expect(res.body.queued).toBe(false);
    expect(res.body.executed).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.egressAllowed).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(failedJob.status).toBe("FAILED");
    expect(failedJob.retryCount).toBe(2);
  });

  it("keeps the unknown id response without creating a job", () => {
    const res = mockRes();
    routes["POST /api/admin/automation/jobs/:id/retry"](adminReq("job_missing"), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, job: null });
  });

  it("does not retry, enqueue, start a worker, or write audit", () => {
    expect(calls).toEqual({ retry: 0, enqueue: 0, list: 0, worker: 0 });
    expect(dbCalls).toEqual([]);
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it("keeps the job list readable", () => {
    const res = mockRes();
    routes["GET /api/admin/automation/jobs"]({
      ...adminReq("unused"),
      query: { status: "FAILED" },
    }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobs).toEqual([
      { id: "job_historical", jobType: "SYSTEM_HEALTH", status: "COMPLETED" },
    ]);
    expect(res.body.counts).toEqual({ FAILED: 1, COMPLETED: 1 });
    expect(calls.list).toBe(1);
    expect(calls.retry).toBe(0);
  });

  it("leaves the commerce database and sales switch untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
