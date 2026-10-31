import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Pusat orchestrator lifecycle", () => {
  let pusat;
  let db;

  beforeAll(() => {
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    pusat.initialize(db);
  });

  it("submits a task with a unique id, correlation id, and persisted meta", () => {
    const submitted = pusat.submitTask({
      title: "Price check fixture A",
      agentCode: "price_assistant",
      payload: { supplierCost: 10, salePrice: 20, sku: "PUSAT-PRICE-A" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    expect(submitted.duplicate).toBe(false);
    expect(submitted.task.id).toMatch(/^task_/);
    expect(submitted.task.correlationId).toMatch(/^corr_/);
    expect(submitted.meta.task_id).toBe(submitted.task.id);
    const row = db.prepare("SELECT * FROM core_ai_task_meta WHERE task_id = ?").get(submitted.task.id);
    expect(row.agent_code).toBe("price_assistant");
    expect(row.input_hash).toBeTruthy();
  });

  it("completes a successful specialist task", async () => {
    const submitted = pusat.submitTask({
      title: "Price check success",
      agentCode: "price_assistant",
      payload: { supplierCost: 12, shippingCost: 2, salePrice: 22, sku: "PUSAT-PRICE-OK" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("COMPLETED");
    expect(result.result.agentCode).toBe("price_assistant");
    expect(result.result.output.invented).toBe(false);
    expect(result.result.output.evidence.minNetProfitEur).toBe(0.5);
  });

  it("fails closed when required cost is missing", async () => {
    const submitted = pusat.submitTask({
      title: "Price check missing cost",
      agentCode: "price_assistant",
      payload: { salePrice: 22, sku: "PUSAT-PRICE-MISS" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("COMPLETED");
    expect(result.result.output.ok).toBe(false);
    expect(result.result.output.missing).toContain("supplierCost");
    expect(result.result.output.invented).toBe(false);
  });

  it("returns the original task for a duplicate idempotency key", () => {
    const key = `idem-price-${Date.now()}`;
    const first = pusat.submitTask({
      title: "Idempotent price",
      agentCode: "price_assistant",
      payload: { supplierCost: 8, salePrice: 18 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    const second = pusat.submitTask({
      title: "Idempotent price again",
      agentCode: "price_assistant",
      payload: { supplierCost: 8, salePrice: 18 },
      idempotencyKey: key,
      createdBy: "test@pusat",
      enqueue: false,
    });
    expect(second.duplicate).toBe(true);
    expect(second.task.id).toBe(first.task.id);
  });

  it("marks timed-out tasks as failed with TIMEOUT", async () => {
    const submitted = pusat.submitTask({
      title: "Timeout fixture",
      agentCode: "price_assistant",
      payload: { supplierCost: 5, salePrice: 15 },
      timeoutMs: 1,
      createdBy: "test@pusat",
      enqueue: false,
    });
    await new Promise((r) => setTimeout(r, 5));
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("FAILED");
    expect(result.result.failureKind).toBe("TIMEOUT");
    expect(result.error).toBe("timeout");
  });

  it("fails when the assigned employee is unavailable", async () => {
    db.prepare(`
      INSERT OR REPLACE INTO core_ai_employees(
        id, name, department, description, responsibility, permissions_json, status, priority, capabilities_json
      ) VALUES ('pusat_pause_probe', 'Pause Probe', 'Test', 'test', 'test', '["ai.execute","products.read","prices.read"]', 'ACTIVE', 1, '[]')
    `).run();
    const submitted = pusat.submitTask({
      title: "Unavailable agent fixture",
      employeeId: "pusat_pause_probe",
      agentCode: "price_assistant",
      payload: { supplierCost: 5, salePrice: 15 },
      createdBy: "test@pusat",
      enqueue: false,
    });
    db.prepare("UPDATE core_ai_employees SET status = 'PAUSED' WHERE id = 'pusat_pause_probe'").run();
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("FAILED");
    expect(result.result.failureKind).toBe("AGENT_UNAVAILABLE");
  });

  it("holds CRITICAL tasks for human approval", async () => {
    const submitted = pusat.submitTask({
      title: "Critical action",
      agentCode: "order_assistant",
      priority: "CRITICAL",
      payload: { action: "order.create", orderNumber: "NOPE" },
      createdBy: "test@pusat",
      enqueue: false,
    });
    const result = await pusat.executeTask(submitted.task.id);
    expect(result.status).toBe("WAITING_APPROVAL");
  });
});
