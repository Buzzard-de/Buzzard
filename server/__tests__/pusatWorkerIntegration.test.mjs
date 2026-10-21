import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat worker recovery", () => {
  let pusat;
  let jobQueue;
  let db;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    jobQueue = require("../lib/jobQueue");
    db = require("../lib/db").db;
    pusat.initialize(db);
  });

  it("recovers abandoned running jobs when the lock expires", () => {
    const job = jobQueue.enqueueJob({
      jobType: "SYSTEM_HEALTH",
      payload: { probe: "pusat-lock" },
      createdBy: "pusat-test",
    });
    const past = new Date(Date.now() - 60_000).toISOString();
    db.prepare(
      `UPDATE core_background_jobs
       SET status = 'RUNNING', lock_owner = 'dead-worker', lock_expires_at = ?
       WHERE id = ?`
    ).run(past, job.id);
    const recovered = pusat.worker.recoverAbandoned();
    expect(recovered.recovered).toBeGreaterThanOrEqual(1);
    const after = jobQueue.getJob(job.id);
    expect(after.status).toBe("RETRYING");
  });

  it("enqueues an AI_TASK job bound to a Pusat task id", () => {
    const submitted = pusat.submitTask({
      title: "Worker bind",
      agentCode: "sales_assistant",
      payload: {},
      createdBy: "test@pusat",
      enqueue: false,
    });
    const job = pusat.worker.enqueueTaskJob(submitted.task.id, { createdBy: "test@pusat" });
    expect(job.jobType).toBe("AI_TASK");
    expect(job.payload.taskId).toBe(submitted.task.id);
  });
});

describe("Pusat integration across agents and engines", () => {
  let pusat;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    pusat.initialize(require("../lib/db").db);
  });

  it("executes a stock task through the central pathway", async () => {
    const submitted = pusat.submitTask({
      title: "Stock integrity check",
      agentCode: "stock_assistant",
      payload: { sku: "INT-STOCK", quantity: 0, source: "unverified" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("COMPLETED");
    expect(result.result.output.failClosed).toBe(true);
    expect(result.result.output.engine).toContain("stockEngine");
  });

  it("executes reporting automation through Pusat", async () => {
    const submitted = pusat.submitTask({
      title: "Reporting run",
      payload: { automation: "reporting" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("COMPLETED");
    expect(result.result.output.workflow).toBe("reporting");
    expect(result.result.output.figureType).toBe("actual");
  });

  it("exposes health and readiness without secrets", async () => {
    const health = await pusat.getHealth();
    expect(health.service).toBe("pusat");
    expect(health.ready).toBe(true);
    expect(health.guardian.local).toBe(true);
    expect(health.salesEnabled).toBe(false);
    expect(JSON.stringify(health)).not.toMatch(/api[_-]?key|password|secret/i);
  });
});
