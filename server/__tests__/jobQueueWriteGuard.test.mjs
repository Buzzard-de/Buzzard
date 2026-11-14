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

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

const rows = new Map();
const dbCalls = [];
const idempotency = { begin: 0, hash: 0 };

function assignColumn(row, column, value) {
  row[column] = value;
}

stub("../lib/db.js", {
  db: {
    prepare(sql) {
      const text = String(sql).replace(/\s+/g, " ").trim();
      dbCalls.push(text);
      return {
        get(...params) {
          if (text.startsWith("SELECT * FROM core_background_jobs WHERE id = ?")) {
            return rows.get(params[0]);
          }
          throw new Error(`unexpected read: ${text}`);
        },
        all(...params) {
          if (text.includes("status = 'RUNNING'") && text.includes("lock_expires_at <")) return [];
          if (text.includes("status IN ('QUEUED', 'RETRYING')")) {
            const nowIso = params[0];
            return [...rows.values()].filter((row) => {
              if (row.status !== "QUEUED" && row.status !== "RETRYING") return false;
              if (row.next_run_at && row.next_run_at > nowIso) return false;
              if (row.lock_owner && row.lock_expires_at && row.lock_expires_at >= nowIso) return false;
              return true;
            });
          }
          throw new Error(`unexpected list: ${text}`);
        },
        run(...params) {
          if (text.includes("SET status = 'RUNNING'")) {
            const [workerId, lockExpires, workerAgain, id, nowIso] = params;
            const row = rows.get(id);
            const open = row && (row.status === "QUEUED" || row.status === "RETRYING")
              && (!row.lock_owner || !row.lock_expires_at || row.lock_expires_at < nowIso);
            if (!open) return { changes: 0 };
            row.status = "RUNNING";
            row.lock_owner = workerId;
            row.lock_expires_at = lockExpires;
            row.worker_id = workerAgain;
            row.started_at = row.started_at || new Date().toISOString();
            row.updated_at = new Date().toISOString();
            return { changes: 1 };
          }
          if (text.startsWith("UPDATE core_background_jobs SET") && text.includes("WHERE id = ?")) {
            const id = params[params.length - 1];
            const row = rows.get(id);
            if (!row) return { changes: 0 };
            const setClause = text.slice(text.indexOf("SET") + 3, text.indexOf("WHERE"));
            let index = 0;
            for (const part of setClause.split(",").map((item) => item.trim())) {
              const eq = part.indexOf("=");
              const column = part.slice(0, eq).trim();
              const expr = part.slice(eq + 1).trim();
              if (expr === "?") assignColumn(row, column, params[index++]);
              else if (expr === "NULL") assignColumn(row, column, null);
              else if (column === "started_at") row.started_at = row.started_at || new Date().toISOString();
              else if (column === "completed_at") row.completed_at = new Date().toISOString();
              else row[column] = new Date().toISOString();
            }
            return { changes: 1 };
          }
          throw new Error(`unexpected write: ${text}`);
        },
      };
    },
    exec() {
      throw new Error("commerce database must stay closed");
    },
  },
});

stub("../lib/operations/jobIdempotency.js", {
  beginOperation() {
    idempotency.begin += 1;
    throw new Error("idempotency must not run");
  },
  hashKey() {
    idempotency.hash += 1;
    throw new Error("idempotency must not run");
  },
});

function seed(id, status) {
  rows.set(id, {
    id,
    job_type: "SYSTEM_HEALTH",
    status,
    payload_json: JSON.stringify({ priority: "NORMAL", maxRetries: 3 }),
    priority: "NORMAL",
    result_json: null,
    error_message: null,
    retry_count: 1,
    next_run_at: "2000-01-01T00:00:00.000Z",
    started_at: null,
    completed_at: null,
    created_at: "2000-01-01T00:00:00.000Z",
    lock_owner: null,
    lock_expires_at: null,
    worker_id: null,
    schedule_id: null,
    execution_ms: null,
    failure_kind: null,
    updated_at: "2000-01-01T00:00:00.000Z",
  });
}

const queuePath = require.resolve("../lib/jobQueue.js");
delete require.cache[queuePath];
const jobQueue = require("../lib/jobQueue.js");

describe("central job queue write guard", () => {
  it("rejects enqueueJob before any database or idempotency call", () => {
    expect(() => jobQueue.enqueueJob({ jobType: "SYSTEM_HEALTH" })).toThrowError(
      expect.objectContaining({ code: "LEGACY_JOB_ENQUEUE_BLOCKED" })
    );
    expect(() => jobQueue.enqueueJob({
      jobType: "PRODUCT_IMPORT",
      idempotencyKey: "must-not-store",
      createdBy: "catalog@example.com",
      payload: { dryRun: false },
    })).toThrowError(expect.objectContaining({ code: "LEGACY_JOB_ENQUEUE_BLOCKED" }));
    expect(dbCalls).toEqual([]);
    expect(idempotency).toEqual({ begin: 0, hash: 0 });
  });

  it("rejects retryJob before any database call", () => {
    expect(() => jobQueue.retryJob("job_failed")).toThrowError(
      expect.objectContaining({ code: "LEGACY_JOB_ENQUEUE_BLOCKED" })
    );
    expect(dbCalls).toEqual([]);
  });

  it("keeps updateJob, markDeadLetter, and claimNextJob behavior", () => {
    seed("job_open", "QUEUED");
    seed("job_failed", "FAILED");

    const updated = jobQueue.updateJob("job_open", {
      status: jobQueue.JOB_STATUS.COMPLETED,
      result: { ok: true },
      executionMs: 12,
    });
    expect(updated.status).toBe("COMPLETED");
    expect(updated.result).toEqual({ ok: true });
    expect(updated.executionMs).toBe(12);
    expect(updated.completedAt).toBeTruthy();
    expect(updated.lockOwner).toBeNull();

    const dead = jobQueue.markDeadLetter("job_failed", "boom", "UNKNOWN");
    expect(dead.status).toBe("DEAD_LETTER");
    expect(dead.error).toBe("boom");
    expect(dead.failureKind).toBe("UNKNOWN");
    expect(dead.completedAt).toBeTruthy();

    seed("job_queued", "QUEUED");
    const claimed = jobQueue.claimNextJob("worker-1");
    expect(claimed.id).toBe("job_queued");
    expect(claimed.status).toBe("RUNNING");
    expect(claimed.lockOwner).toBe("worker-1");
    expect(claimed.workerId).toBe("worker-1");
    expect(jobQueue.claimNextJob("worker-2")).toBeNull();
    expect(dbCalls.length).toBeGreaterThan(0);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
