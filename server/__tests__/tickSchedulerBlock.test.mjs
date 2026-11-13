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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-tick-block-"));
const syntheticPath = path.join(tempDir, "schedules.sqlite");

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
  CREATE TABLE core_background_jobs(
    id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL
  );
`);

const dueAt = "2020-01-01T00:00:00.000Z";
const insert = synthetic.prepare(`
  INSERT INTO core_scheduled_jobs(
    id, name, job_type, schedule_type, interval_ms, payload_json, priority, enabled, next_run_at, run_count
  ) VALUES (?, ?, ?, ?, ?, ?, 'NORMAL', 1, ?, 0)
`);
insert.run("sched_once", "one", "PRODUCT_IMPORT", "ONE_TIME", null, JSON.stringify({ dryRun: false }), dueAt);
insert.run("sched_recur", "recur", "PRODUCT_MAPPING", "RECURRING", 3600000, JSON.stringify({ dryRun: false }), dueAt);
insert.run("sched_delay", "delay", "SYSTEM_HEALTH", "DELAYED", 60000, JSON.stringify({ live: true }), dueAt);

const writes = [];
const originalPrepare = synthetic.prepare.bind(synthetic);
synthetic.prepare = (sql) => {
  if (/^\s*(insert|update|delete)/i.test(sql)) writes.push(String(sql));
  return originalPrepare(sql);
};

const dbResolved = require.resolve("../lib/db.js");
require.cache[dbResolved] = {
  id: dbResolved,
  filename: dbResolved,
  loaded: true,
  exports: { db: synthetic },
};

const enqueueCalls = [];
const queueResolved = require.resolve("../lib/jobQueue.js");
require.cache[queueResolved] = {
  id: queueResolved,
  filename: queueResolved,
  loaded: true,
  exports: {
    enqueueJob(input) {
      enqueueCalls.push(input);
      throw new Error("enqueue must not run");
    },
  },
};

const jobScheduler = require("../lib/jobScheduler.js");

function snapshot() {
  return synthetic.prepare(`
    SELECT id, schedule_type, enabled, next_run_at, last_run_at, run_count
    FROM core_scheduled_jobs ORDER BY id
  `).all();
}

const beforeTick = snapshot();

afterAll(() => {
  synthetic.close();
});

describe("tickScheduler automatic enqueue block", () => {
  it("does not queue due ONE_TIME, RECURRING, or DELAYED schedules", () => {
    const enqueued = jobScheduler.tickScheduler(new Date("2026-11-13T21:20:00.000Z"));
    expect(enqueued).toEqual([]);
    expect(enqueueCalls).toEqual([]);
    expect(writes).toEqual([]);
    expect(snapshot()).toEqual(beforeTick);
    expect(beforeTick.map((row) => row.schedule_type)).toEqual(["DELAYED", "ONE_TIME", "RECURRING"]);
    expect(beforeTick.every((row) => row.enabled === 1 && row.next_run_at === dueAt && row.run_count === 0)).toBe(true);
    expect(synthetic.prepare("SELECT COUNT(*) AS n FROM core_background_jobs").get().n).toBe(0);
  });

  it("keeps schedule listing available", () => {
    const listed = jobScheduler.listSchedules({ limit: 10 }).slice().sort((a, b) => a.id.localeCompare(b.id));
    expect(listed.map((row) => row.id)).toEqual(["sched_delay", "sched_once", "sched_recur"]);
    expect(listed.map((row) => row.jobType)).toEqual(["SYSTEM_HEALTH", "PRODUCT_IMPORT", "PRODUCT_MAPPING"]);
    expect(snapshot()).toEqual(beforeTick);
  });

  it("leaves the commerce database and sales switch untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
    const source = fs.readFileSync(path.join(repoRoot, "server/lib/jobScheduler.js"), "utf8");
    const tick = source.slice(source.indexOf("function tickScheduler"), source.indexOf("module.exports"));
    expect(tick).not.toMatch(/enqueueJob|startWorker|executeJob/);
  });
});
