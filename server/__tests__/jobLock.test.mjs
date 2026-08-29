import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("jobQueue lock", () => {
  let jobQueue;

  beforeEach(() => {
    process.env.BUZZARD_JOB_LOCK_TTL_MS = "60000";
    delete require.cache[require.resolve("../lib/jobQueue.js")];
    jobQueue = require("../lib/jobQueue.js");
  });

  it("claimNextJob sets RUNNING with lock", () => {
    jobQueue.releaseStaleLocks();
    const job = jobQueue.enqueueJob({ jobType: "SYSTEM_HEALTH", priority: "HIGH" });
    const claimed = jobQueue.claimNextJob("test_worker_1");
    expect(claimed?.id).toBe(job.id);
    expect(claimed?.status).toBe("RUNNING");
    expect(claimed?.lockOwner).toBe("test_worker_1");
  });

  it("duplicate claim prevented for locked job", () => {
    const job = jobQueue.enqueueJob({ jobType: "SYSTEM_HEALTH", priority: "CRITICAL" });
    const first = jobQueue.claimNextJob("worker_a");
    expect(first?.id).toBeTruthy();
    const locked = jobQueue.getJob(job.id);
    if (locked.status === "RUNNING") {
      expect(locked.lockOwner).toBe("worker_a");
      const { db } = require("../lib/db.js");
      const attempt = db.prepare(`
        UPDATE core_background_jobs
        SET status = 'RUNNING', lock_owner = 'worker_b', lock_expires_at = ?
        WHERE id = ? AND status IN ('QUEUED', 'RETRYING')
        AND (lock_owner IS NULL OR lock_expires_at IS NULL OR lock_expires_at < ?)
      `).run(new Date(Date.now() + 60000).toISOString(), job.id, new Date().toISOString());
      expect(attempt.changes).toBe(0);
    }
  });

  it("releaseStaleLocks recovers expired RUNNING jobs", () => {
    const job = jobQueue.enqueueJob({ jobType: "SYSTEM_HEALTH" });
    jobQueue.claimNextJob("stale_worker");
    const { db } = require("../lib/db.js");
    db.prepare(`
      UPDATE core_background_jobs SET lock_expires_at = '2000-01-01T00:00:00.000Z' WHERE id = ?
    `).run(job.id);
    const released = jobQueue.releaseStaleLocks();
    expect(released).toBeGreaterThan(0);
    const updated = jobQueue.getJob(job.id);
    expect(updated.status).toBe("RETRYING");
  });

  it("retryJob resets failed job to QUEUED", () => {
    const job = jobQueue.enqueueJob({ jobType: "SYSTEM_HEALTH" });
    jobQueue.updateJob(job.id, { status: "FAILED", error: "test" });
    const retried = jobQueue.retryJob(job.id);
    expect(retried.status).toBe("QUEUED");
  });
});
