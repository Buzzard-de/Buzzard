import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-schedule-create-block-"));
const syntheticPath = path.join(tempDir, "schedules.sqlite");
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
process.env.BUZZARD_AUDIT_DIR = tempDir;

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);

const synthetic = new Database(syntheticPath);
synthetic.exec(`
  CREATE TABLE core_scheduled_jobs(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    job_type TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    cron_expr TEXT,
    interval_ms INTEGER,
    payload_json TEXT DEFAULT '{}',
    priority TEXT DEFAULT 'NORMAL',
    enabled INTEGER DEFAULT 1,
    next_run_at TEXT,
    last_run_at TEXT,
    run_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE schedule_idempotency(
    idempotency_key TEXT PRIMARY KEY,
    response_json TEXT
  );
`);
synthetic.prepare(`
  INSERT INTO core_scheduled_jobs(
    id, name, job_type, schedule_type, payload_json, enabled, next_run_at, run_count, created_by
  ) VALUES ('sched_existing', 'kept', 'SYSTEM_HEALTH', 'RECURRING', '{}', 1, '2030-01-01T00:00:00.000Z', 4, 'seed')
`).run();

const writes = [];
const originalPrepare = synthetic.prepare.bind(synthetic);
synthetic.prepare = (sql) => {
  if (/^\s*(insert|update|delete)/i.test(sql)) writes.push(String(sql));
  return originalPrepare(sql);
};

function stub(resolved, exports) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

stub(require.resolve("../lib/db.js"), {
  db: synthetic,
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
stub(require.resolve("../lib/jobQueue.js"), {
  enqueueJob() {
    throw new Error("queue must stay closed");
  },
  listJobs() {
    return [];
  },
  countJobsByStatus() {
    return {};
  },
  getJob() {
    return null;
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

function adminReq(body, headers = {}) {
  return {
    body,
    headers,
    query: {},
    params: {},
    url: "/api/admin/automation/schedules",
    adminUser: {
      userId: "synthetic-admin",
      role: "admin",
      email: "admin@example.com",
      name: "Synthetic",
    },
  };
}

function postSchedule(body, headers) {
  const res = mockRes();
  routes["POST /api/admin/automation/schedules"](adminReq(body, headers), res);
  return res;
}

function expectBlocked(res) {
  expect(res.statusCode).toBe(403);
  expect(res.body.success).toBe(false);
  expect(res.body.errorCode).toBe("LEGACY_SCHEDULE_CREATE_BLOCKED");
  expect(res.body.queued).toBe(false);
  expect(res.body.executed).toBe(false);
  expect(res.body.salesOpen).toBe(false);
  expect(res.body.egressAllowed).toBe(false);
  expect(res.body.productionReady).toBe(false);
  expect(res.body.schedule).toBeUndefined();
}

function scheduleRows() {
  return synthetic.prepare("SELECT id, enabled, next_run_at, run_count FROM core_scheduled_jobs ORDER BY id").all();
}

afterAll(() => {
  synthetic.close();
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
});

describe("legacy automation schedule create block", () => {
  it("rejects ONE_TIME, RECURRING, and DELAYED before createSchedule", () => {
    expectBlocked(postSchedule({
      name: "once",
      jobType: "PRODUCT_IMPORT",
      scheduleType: "ONE_TIME",
      nextRunAt: "2020-01-01T00:00:00.000Z",
      payload: { dryRun: false, raw: { sku: "SYNTH-1" } },
      idempotencyKey: "once-must-not-store",
    }, { "idempotency-key": "once-header-must-not-store" }));
    expectBlocked(postSchedule({
      name: "recur",
      jobType: "PRODUCT_MAPPING",
      scheduleType: "RECURRING",
      intervalMs: 60000,
      payload: { dryRun: false, supplierId: "mock", supplierSku: "SYNTH-1" },
      idempotencyKey: "recur-must-not-store",
    }));
    expectBlocked(postSchedule({
      name: "delay",
      jobType: "SYSTEM_HEALTH",
      scheduleType: "DELAYED",
      intervalMs: 5000,
      payload: { live: true, egress: true },
      idempotencyKey: "delay-must-not-store",
    }, { "idempotency-key": "delay-header-must-not-store" }));
    expectBlocked(postSchedule({}));
  });

  it("does not insert a schedule, an idempotency row, or an audit file", () => {
    expect(writes).toEqual([]);
    expect(scheduleRows()).toEqual([
      { id: "sched_existing", enabled: 1, next_run_at: "2030-01-01T00:00:00.000Z", run_count: 4 },
    ]);
    expect(synthetic.prepare("SELECT COUNT(*) AS n FROM schedule_idempotency").get().n).toBe(0);
    expect(fs.readdirSync(tempDir).filter((name) => name !== "schedules.sqlite")).toEqual([]);
  });

  it("keeps schedule listing available", () => {
    const res = mockRes();
    routes["GET /api/admin/automation/schedules"](adminReq({}), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.schedules.map((row) => row.id)).toEqual(["sched_existing"]);
    expect(res.body.schedules[0].enabled).toBe(true);
    expect(res.body.schedules[0].nextRunAt).toBe("2030-01-01T00:00:00.000Z");
    expect(writes).toEqual([]);
  });

  it("keeps delete disabling the existing schedule", () => {
    const res = mockRes();
    const req = adminReq({});
    req.params = { id: "sched_existing" };
    routes["DELETE /api/admin/automation/schedules/:id"](req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.schedule.id).toBe("sched_existing");
    expect(res.body.schedule.enabled).toBe(false);
    expect(res.body.schedule.nextRunAt).toBe("2030-01-01T00:00:00.000Z");
    expect(res.body.schedule.runCount).toBe(4);
    expect(scheduleRows()).toEqual([
      { id: "sched_existing", enabled: 0, next_run_at: "2030-01-01T00:00:00.000Z", run_count: 4 },
    ]);
    expect(writes.some((sql) => /INSERT\s+INTO\s+core_scheduled_jobs/i.test(sql))).toBe(false);
    expect(synthetic.prepare("SELECT COUNT(*) AS n FROM schedule_idempotency").get().n).toBe(0);
  });

  it("leaves the commerce database and sales switch untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
