import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat dispatch idempotency (item 42, existing task meta)", () => {
  let pusat;
  let db;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    pusat.initialize(db);
  });

  it("replays the same payload without a second task", () => {
    const key = `disp-replay-${Date.now()}`;
    const payload = { supplierCost: 8, salePrice: 18 };
    const first = pusat.submitTask({
      title: "Idempotent price",
      agentCode: "price_assistant",
      payload,
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    const second = pusat.submitTask({
      title: "Idempotent price again",
      agentCode: "price_assistant",
      payload,
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.replayed).toBe(true);
    expect(second.inProgress).toBe(false);
    expect(second.enqueued).toBe(false);
    expect(second.task.id).toBe(first.task.id);
    const count = db.prepare("SELECT COUNT(*) n FROM core_ai_task_meta WHERE idempotency_key = ?").get(key).n;
    expect(count).toBe(1);
  });

  it("rejects the same key with a conflicting payload", () => {
    const key = `disp-conflict-${Date.now()}`;
    pusat.submitTask({
      title: "Conflict price",
      agentCode: "price_assistant",
      payload: { supplierCost: 8, salePrice: 18 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    expect(() =>
      pusat.submitTask({
        title: "Conflict price",
        agentCode: "price_assistant",
        payload: { supplierCost: 99, salePrice: 18 },
        idempotencyKey: key,
        createdBy: "test@pusat",
        enqueue: false,
      })
    ).toThrow(/different payload/);
    try {
      pusat.submitTask({
        title: "Conflict price",
        agentCode: "price_assistant",
        payload: { supplierCost: 99, salePrice: 18 },
        idempotencyKey: key,
        createdBy: "test@pusat",
        enqueue: false,
      });
    } catch (error) {
      expect(error.code).toBe("IDEMPOTENCY_CONFLICT");
      expect(error.statusCode).toBe(409);
    }
  });

  it("reports in-progress instead of creating a second dispatch", () => {
    const key = `disp-run-${Date.now()}`;
    const first = pusat.submitTask({
      title: "Running price",
      agentCode: "price_assistant",
      payload: { supplierCost: 5, salePrice: 15 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    db.prepare("UPDATE core_ai_tasks SET status = 'RUNNING' WHERE id = ?").run(first.task.id);
    const second = pusat.submitTask({
      title: "Running price",
      agentCode: "price_assistant",
      payload: { supplierCost: 5, salePrice: 15 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    expect(second.duplicate).toBe(true);
    expect(second.inProgress).toBe(true);
    expect(second.replayed).toBe(false);
    expect(second.task.id).toBe(first.task.id);
  });

  it("replays a failed task without creating a second dispatch", () => {
    const key = `disp-fail-${Date.now()}`;
    const first = pusat.submitTask({
      title: "Failed price",
      agentCode: "price_assistant",
      payload: { supplierCost: 6, salePrice: 16 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    db.prepare("UPDATE core_ai_tasks SET status = 'FAILED' WHERE id = ?").run(first.task.id);
    const second = pusat.submitTask({
      title: "Failed price",
      agentCode: "price_assistant",
      payload: { supplierCost: 6, salePrice: 16 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: true,
    });
    expect(second.duplicate).toBe(true);
    expect(second.enqueued).toBe(false);
    expect(second.task.id).toBe(first.task.id);
    expect(second.task.status).toBe("FAILED");
    const count = db.prepare("SELECT COUNT(*) n FROM core_ai_task_meta WHERE idempotency_key = ?").get(key).n;
    expect(count).toBe(1);
  });

  it("serial concurrent submits share one task id", () => {
    const key = `disp-conc-${Date.now()}`;
    const payload = { supplierCost: 7, salePrice: 17 };
    const results = [1, 2, 3].map(() =>
      pusat.submitTask({
        title: "Concurrent price",
        agentCode: "price_assistant",
        payload,
        idempotencyKey: key,
        createdBy: "test@pusat",
        enqueue: false,
      })
    );
    const ids = new Set(results.map((row) => row.task.id));
    expect(ids.size).toBe(1);
    expect(results.filter((row) => row.duplicate).length).toBe(2);
  });
});
