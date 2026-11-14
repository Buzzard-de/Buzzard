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
const dbCalls = [];

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

stub("../lib/db.js", {
  db: {
    prepare(sql) {
      dbCalls.push(String(sql));
      throw new Error("commerce database must stay closed");
    },
    exec() {
      throw new Error("commerce database must stay closed");
    },
  },
});
stub("../lib/jobHandlers.js", {
  executeJob() {
    throw new Error("job handler must not run");
  },
});
stub("../lib/jobObservability.js", {
  appendJobLog() {
    throw new Error("job log must not be written");
  },
});

delete require.cache[require.resolve("../lib/jobQueue.js")];
delete require.cache[require.resolve("../lib/jobWorker.js")];
const jobQueue = require("../lib/jobQueue.js");
const jobWorker = require("../lib/jobWorker.js");

describe("job queue lock mutations stay closed", () => {
  it("refuses claim, stale recovery, and retry before SQLite", () => {
    expect(() => jobQueue.claimNextJob("test_worker_1")).toThrowError(
      expect.objectContaining({ code: "LEGACY_JOB_MUTATION_BLOCKED" })
    );
    expect(() => jobQueue.releaseStaleLocks(new Date("2000-01-01T00:00:00.000Z"))).toThrowError(
      expect.objectContaining({ code: "LEGACY_JOB_MUTATION_BLOCKED" })
    );
    expect(() => jobQueue.extendLock("job_locked", "test_worker_1")).toThrowError(
      expect.objectContaining({ code: "LEGACY_JOB_MUTATION_BLOCKED" })
    );
    expect(() => jobQueue.retryJob("job_failed")).toThrowError(
      expect.objectContaining({ code: "LEGACY_JOB_ENQUEUE_BLOCKED" })
    );
    expect(dbCalls).toEqual([]);
  });

  it("refuses worker start, tick, pause, and stop before worker state is written", async () => {
    expect(() => jobWorker.startWorker()).toThrowError(
      expect.objectContaining({ code: "LEGACY_WORKER_START_BLOCKED" })
    );
    expect(() => jobWorker.resumeWorker()).toThrowError(
      expect.objectContaining({ code: "LEGACY_WORKER_START_BLOCKED" })
    );
    expect(() => jobWorker.pauseWorker()).toThrowError(
      expect.objectContaining({ code: "LEGACY_WORKER_MUTATION_BLOCKED" })
    );
    expect(() => jobWorker.stopWorker()).toThrowError(
      expect.objectContaining({ code: "LEGACY_WORKER_MUTATION_BLOCKED" })
    );
    expect(() => jobWorker.setupGracefulShutdown()).toThrowError(
      expect.objectContaining({ code: "LEGACY_WORKER_MUTATION_BLOCKED" })
    );
    await expect(jobWorker.tick()).rejects.toMatchObject({ code: "LEGACY_WORKER_MUTATION_BLOCKED" });
    await expect(jobWorker.processOneJob()).rejects.toMatchObject({ code: "LEGACY_WORKER_MUTATION_BLOCKED" });
    expect(dbCalls).toEqual([]);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
