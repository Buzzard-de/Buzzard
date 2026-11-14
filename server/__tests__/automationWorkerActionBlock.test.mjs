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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-worker-action-"));
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

const calls = { start: 0, pause: 0, resume: 0, stop: 0, enqueue: 0, claim: 0, execute: 0 };
const stopped = { status: "STOPPED", workerId: null, jobsProcessed: 0 };
stub(require.resolve("../lib/jobWorker.js"), {
  getWorkerState() {
    return { ...stopped };
  },
  startWorker() {
    calls.start += 1;
    throw new Error("worker must not start");
  },
  resumeWorker() {
    calls.resume += 1;
    throw new Error("worker must not resume");
  },
  pauseWorker() {
    calls.pause += 1;
    return { ...stopped, status: "PAUSED" };
  },
  stopWorker() {
    calls.stop += 1;
    return { ...stopped };
  },
  tick() {
    throw new Error("worker tick must not run");
  },
  processOneJob() {
    throw new Error("job execution must not run");
  },
});
stub(require.resolve("../lib/jobQueue.js"), {
  enqueueJob() {
    calls.enqueue += 1;
    throw new Error("queue must stay closed");
  },
  claimNextJob() {
    calls.claim += 1;
    throw new Error("queue must stay closed");
  },
  listJobs() {
    return [{ id: "job_historical", jobType: "SYSTEM_HEALTH", status: "COMPLETED" }];
  },
  countJobsByStatus() {
    return { COMPLETED: 1 };
  },
  releaseStaleLocks() {
    throw new Error("locks must stay untouched");
  },
});
stub(require.resolve("../lib/jobScheduler.js"), {
  listSchedules() {
    return [];
  },
  tickScheduler() {
    throw new Error("scheduler must not tick");
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

function postAction(action, role, body = {}) {
  const res = mockRes();
  routes["POST /api/admin/automation/worker/:action"]({
    body,
    headers: {},
    query: {},
    params: { action },
    url: `/api/admin/automation/worker/${action}`,
    adminUser: role
      ? { userId: "synthetic-admin", role, email: "admin@example.com", name: "Synthetic" }
      : undefined,
  }, res);
  return res;
}

afterAll(() => {
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

describe("automation worker action guard", () => {
  it("rejects callers without system.configure", () => {
    const res = postAction("start", "staff", { status: "RUNNING", salesEnabled: true });
    expect(res.statusCode).toBe(403);
    expect(res.body.errorKey).toBe("admin.auth.forbidden");
    expect(calls).toEqual({ start: 0, pause: 0, resume: 0, stop: 0, enqueue: 0, claim: 0, execute: 0 });
  });

  it("blocks start and resume before the worker and the queue", () => {
    for (const action of ["start", "resume"]) {
      const res = postAction(action, "admin", {
        status: "RUNNING",
        salesEnabled: true,
        productionReady: true,
        egressAllowed: true,
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.errorCode).toBe("LEGACY_WORKER_START_BLOCKED");
      expect(res.body.executed).toBe(false);
      expect(res.body.queued).toBe(false);
      expect(res.body.salesOpen).toBe(false);
      expect(res.body.productionReady).toBe(false);
      expect(res.body.worker).toBeUndefined();
    }
    expect(calls.start).toBe(0);
    expect(calls.resume).toBe(0);
    expect(calls.enqueue).toBe(0);
    expect(calls.claim).toBe(0);
    expect(dbCalls).toEqual([]);
    expect(fs.readdirSync(tempDir)).toEqual([]);
  });

  it("rejects actions outside pause and stop without changing the worker", () => {
    for (const action of ["START", "run", "execute", "tick", "", "start/stop"]) {
      const res = postAction(action, "admin", { status: "RUNNING" });
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ success: false, errorKey: "automation.invalidAction" });
    }
    expect(calls).toEqual({ start: 0, pause: 0, resume: 0, stop: 0, enqueue: 0, claim: 0, execute: 0 });
    expect(dbCalls).toEqual([]);
  });

  it("keeps pause and stop from starting work or touching the queue", () => {
    const paused = postAction("pause", "admin", { status: "RUNNING", paymentStatus: "paid" });
    const stopped = postAction("stop", "admin");
    expect(paused.statusCode).toBe(200);
    expect(paused.body.worker.status).toBe("PAUSED");
    expect(stopped.statusCode).toBe(200);
    expect(stopped.body.worker.status).toBe("STOPPED");
    expect(calls).toEqual({ start: 0, pause: 1, resume: 0, stop: 1, enqueue: 0, claim: 0, execute: 0 });
    expect(dbCalls).toEqual([]);
  });

  it("leaves the commerce database and sales switch untouched", () => {
    const listed = mockRes();
    routes["GET /api/admin/automation/worker"]({
      body: {},
      headers: {},
      query: {},
      params: {},
      adminUser: { userId: "synthetic-admin", role: "admin", email: "admin@example.com", name: "Synthetic" },
    }, listed);
    expect(listed.statusCode).toBe(200);
    expect(listed.body.worker.status).toBe("STOPPED");
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
