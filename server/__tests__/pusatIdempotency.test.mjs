import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const { createIdempotencyService, STATUS } = require("../lib/pusat/idempotencyService.js");

function memoryDb() {
  return new Database(":memory:");
}

const CORE_AI_TASK_COLUMNS = [
  "id",
  "title",
  "description",
  "employee_id",
  "priority",
  "status",
  "permissions_required_json",
  "payload_json",
  "result_json",
  "error_message",
  "retry_count",
  "max_retries",
  "depends_on_task_id",
  "created_by",
  "assigned_at",
  "started_at",
  "completed_at",
  "created_at",
  "updated_at",
];

describe("pusat idempotency service", () => {
  afterEach(() => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    delete process.env.BUZZARD_SALES_ENABLED;
    delete process.env.BUZZARD_PRODUCT_SOT_ACTIVE;
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
  });

  it("executes once and replays the same payload", async () => {
    const db = memoryDb();
    const service = createIdempotencyService(db);
    let runs = 0;
    const first = await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-replay",
      payload: { action: "PING", z: 1, a: 2 },
      execute: async () => {
        runs += 1;
        return { ok: true, n: runs };
      },
    });
    const second = await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-replay",
      payload: { a: 2, action: "PING", z: 1 },
      execute: async () => {
        runs += 1;
        return { ok: true, n: runs };
      },
    });
    expect(first.replayed).toBe(false);
    expect(first.result).toEqual({ ok: true, n: 1 });
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual({ ok: true, n: 1 });
    expect(runs).toBe(1);
  });

  it("rejects the same key with a different payload", async () => {
    const service = createIdempotencyService(memoryDb());
    await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-conflict",
      payload: { action: "PING" },
      execute: async () => ({ ok: true }),
    });
    await expect(
      service.execute({
        operation: "PUSAT_DISPATCH",
        idempotencyKey: "k-conflict",
        payload: { action: "GET_PRODUCT" },
        execute: async () => ({ ok: true }),
      })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", statusCode: 409 });
  });

  it("does not run a second handler while IN_PROGRESS", async () => {
    const db = memoryDb();
    const service = createIdempotencyService(db);
    const crypto = require("crypto");
    function stableSort(value) {
      if (Array.isArray(value)) return value.map(stableSort);
      if (value !== null && typeof value === "object") {
        return Object.keys(value)
          .sort()
          .reduce((acc, key) => {
            acc[key] = stableSort(value[key]);
            return acc;
          }, {});
      }
      return value;
    }
    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(stableSort({ action: "PING" })), "utf8")
      .digest("hex");
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO pusat_idempotency (
        id, operation, idempotency_key, request_hash, status,
        result_json, error_json, correlation_id, actor_id,
        created_at, started_at, completed_at, expires_at, attempt_count
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL, ?, 1)`
    ).run(
      "row-1",
      "PUSAT_DISPATCH",
      "k-progress",
      requestHash,
      STATUS.IN_PROGRESS,
      now,
      now,
      new Date(Date.now() + 60_000).toISOString()
    );
    await expect(
      service.execute({
        operation: "PUSAT_DISPATCH",
        idempotencyKey: "k-progress",
        payload: { action: "PING" },
        execute: async () => ({ ok: true }),
      })
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS", statusCode: 409 });
  });

  it("retries a FAILED row when retryFailed is true", async () => {
    const service = createIdempotencyService(memoryDb(), { retryFailed: true });
    await expect(
      service.execute({
        operation: "PUSAT_DISPATCH",
        idempotencyKey: "k-fail",
        payload: { action: "PING" },
        execute: async () => {
          throw Object.assign(new Error("boom"), { code: "TEST_FAIL" });
        },
      })
    ).rejects.toMatchObject({ message: "boom" });
    const retry = await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-fail",
      payload: { action: "PING" },
      execute: async () => ({ ok: true, recovered: true }),
    });
    expect(retry.replayed).toBe(false);
    expect(retry.result).toEqual({ ok: true, recovered: true });
    expect(service.get({ operation: "PUSAT_DISPATCH", idempotencyKey: "k-fail" }).attemptCount).toBe(3);
  });

  it("creates pusat_idempotency without altering core_ai_tasks columns", () => {
    const db = memoryDb();
    db.exec(`
      CREATE TABLE core_ai_tasks(
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        employee_id TEXT,
        priority TEXT DEFAULT 'NORMAL',
        status TEXT DEFAULT 'PENDING',
        permissions_required_json TEXT DEFAULT '[]',
        payload_json TEXT DEFAULT '{}',
        result_json TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        depends_on_task_id TEXT,
        created_by TEXT,
        assigned_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    createIdempotencyService(db);
    const columns = db.prepare("PRAGMA table_info(core_ai_tasks)").all().map((c) => c.name);
    expect(columns).toEqual(CORE_AI_TASK_COLUMNS);
    const pusat = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pusat_idempotency'").get();
    expect(pusat.name).toBe("pusat_idempotency");
  });

  it("wraps Pusat read-only dispatch without enabling sales or exclusive SoT", async () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusat = await import("../lib/pusat/runtime.js");
    const first = await pusat.dispatch({
      action: "PING",
      payload: {},
      idempotencyKey: "runtime-ping-1",
    });
    const second = await pusat.dispatch({
      action: "PING",
      payload: {},
      idempotencyKey: "runtime-ping-1",
    });
    expect(first.result.ok).toBe(true);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.result.ok).toBe(true);
    expect(pusat.executeReadOnly("CREATE_ORDER", {}).code).toBe("PERMISSION_DENIED");
    const { evaluateSalesGate } = await import("../lib/salesSafetyGate.js");
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    delete process.env.BUZZARD_SALES_ENABLED;
    expect(evaluateSalesGate().status).toBe("LOCKED");
    const productSot = await import("../lib/productSot.js");
    expect(productSot.getStatus().active).toBe(false);
  });
});
