import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const serverRequire = createRequire(path.join(repoRoot, "server/package.json"));
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const previousRuntime = process.env.PUSAT_RUNTIME_ENABLED;
const previousOrchDb = process.env.PUSAT_ORCH_DB;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-pusat-idem-"));
const commerceName = path.join(dir, "commerce-mock.sqlite");
const calls = { commerce: 0, opened: [] };

function CountingDatabase(filename, options) {
  const file = String(filename);
  calls.opened.push(file);
  if (path.basename(file) === "buzzard.db" || file.includes(`${path.sep}server${path.sep}data${path.sep}`)) {
    throw new Error("commerce database must stay closed");
  }
  return new RealDatabase(filename, options);
}
require.cache[sqliteId] = { id: sqliteId, filename: sqliteId, loaded: true, exports: CountingDatabase };

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

const commerce = {
  name: commerceName,
  exec(sql) {
    calls.commerce += 1;
    throw new Error(`commerce exec ${sql}`);
  },
  prepare(sql) {
    calls.commerce += 1;
    throw new Error(`commerce prepare ${sql}`);
  },
};

stub("../lib/db.js", { db: commerce });
stub("../lib/productService.js", {});
stub("../lib/productSot.js", {
  isSotActive() {
    return false;
  },
  getStatus() {
    return { status: "OBSERVER", exclusive: false, active: false };
  },
});
stub("../lib/commerce/inventoryIntegration.js", {});
stub("../lib/commerce/pricingIntegration.js", {});

const { createIdempotencyService, openIdempotencyDatabase } = require("../lib/pusat/idempotencyService.js");

function loadRuntime() {
  const runtimePath = require.resolve("../lib/pusat/runtime.js");
  delete require.cache[runtimePath];
  return require("../lib/pusat/runtime.js");
}

function tableNames(file) {
  const handle = new RealDatabase(file, { readonly: true, fileMustExist: true });
  try {
    return handle.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all().map((row) => row.name);
  } finally {
    handle.close();
  }
}

describe("pusat idempotency stays off the commerce database", () => {
  it("creates, updates, and deletes rows only on the isolated file", async () => {
    const pusatFile = path.join(dir, "idempotency.sqlite");
    const opened = calls.opened.length;
    const handle = openIdempotencyDatabase({ dbPath: pusatFile, commercePath: commerceName });
    const service = createIdempotencyService(handle, { commercePath: commerceName });
    expect(calls.opened.slice(opened)).toEqual([pusatFile]);
    expect(tableNames(pusatFile)).toEqual(["pusat_idempotency"]);

    let runs = 0;
    const first = await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-replay",
      payload: { action: "PING" },
      execute: async () => {
        runs += 1;
        return { ok: true, n: runs };
      },
    });
    const second = await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-replay",
      payload: { action: "PING" },
      execute: async () => {
        runs += 1;
        return { ok: true, n: runs };
      },
    });
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual({ ok: true, n: 1 });
    expect(handle.prepare(`SELECT status FROM pusat_idempotency WHERE idempotency_key = ?`).get("k-replay").status).toBe("SUCCEEDED");

    await expect(service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-replay",
      payload: { action: "OTHER" },
      execute: async () => ({ ok: true }),
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", statusCode: 409 });

    await expect(service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-fail",
      payload: { action: "PING" },
      execute: async () => {
        throw Object.assign(new Error("boom"), { code: "TEST_FAIL" });
      },
    })).rejects.toMatchObject({ message: "boom" });
    const recovered = await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-fail",
      payload: { action: "PING" },
      execute: async () => ({ ok: true, recovered: true }),
    });
    expect(recovered.result).toEqual({ ok: true, recovered: true });
    expect(service.get({ operation: "PUSAT_DISPATCH", idempotencyKey: "k-fail" }).attemptCount).toBe(3);

    const past = new Date(Date.now() - 60_000).toISOString();
    handle.prepare(`
      INSERT INTO pusat_idempotency (
        id, operation, idempotency_key, request_hash, status,
        result_json, error_json, correlation_id, actor_id,
        created_at, started_at, completed_at, expires_at, attempt_count
      ) VALUES ('old-id', 'PUSAT_DISPATCH', 'k-expire', 'hash', 'FAILED', NULL, NULL, NULL, NULL, ?, ?, NULL, ?, 1)
    `).run(past, past, past);
    await service.execute({
      operation: "PUSAT_DISPATCH",
      idempotencyKey: "k-expire",
      payload: { action: "PING" },
      execute: async () => ({ ok: true, replaced: true }),
    });
    expect(handle.prepare(`SELECT id FROM pusat_idempotency WHERE id = 'old-id'`).get()).toBeUndefined();
    expect(handle.prepare(`SELECT status FROM pusat_idempotency WHERE idempotency_key = ?`).get("k-expire").status).toBe("SUCCEEDED");
    expect(calls.commerce).toBe(0);
    expect(fs.existsSync(commerceName)).toBe(false);
    handle.close();
  });

  it("dispatches through the isolated file and refuses a shared or protected path before sqlite opens", async () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusatFile = path.join(dir, "dispatch.sqlite");
    commerce.name = commerceName;
    process.env.PUSAT_ORCH_DB = pusatFile;
    const pusat = loadRuntime();
    const opened = calls.opened.length;
    let runs = 0;
    const first = await pusat.dispatch({ action: "PING", payload: {}, idempotencyKey: "dispatch-replay" });
    const second = await pusat.dispatch({
      action: "PING",
      payload: {},
      idempotencyKey: "dispatch-replay",
    });
    expect(first.replayed).toBe(false);
    expect(first.result.ok).toBe(true);
    expect(second.replayed).toBe(true);
    expect(calls.opened.slice(opened)).toEqual([pusatFile]);
    expect(tableNames(pusatFile)).toContain("pusat_idempotency");
    expect(calls.commerce).toBe(0);

    const shared = path.join(dir, "same-file.sqlite");
    commerce.name = shared;
    process.env.PUSAT_ORCH_DB = shared;
    const same = loadRuntime();
    const beforeSame = calls.opened.length;
    const refused = await same.dispatch({ action: "PING", payload: {}, idempotencyKey: "must-not-run" });
    expect(refused.result.ok).toBe(false);
    expect(refused.result.code).toBe("DATA_PATH_REFUSED");
    expect(refused.result.salesOpen).toBe(false);
    expect(refused.result.egressAllowed).toBe(false);
    expect(refused.result.productionReady).toBe(false);
    expect(calls.opened).toHaveLength(beforeSame);
    expect(fs.existsSync(shared)).toBe(false);

    for (const blocked of [commerceDb, path.join(repoRoot, "server/data/custom.sqlite"), path.join(dir, "buzzard_guardian_idem.sqlite")]) {
      process.env.PUSAT_ORCH_DB = blocked;
      const guarded = loadRuntime();
      const before = calls.opened.length;
      const result = await guarded.dispatch({ action: "PING", payload: {}, idempotencyKey: "blocked-key" });
      expect(result.result.ok).toBe(false);
      expect(["DATA_PATH_REFUSED", "GUARDIAN_SQLITE_FORBIDDEN"]).toContain(result.result.code);
      expect(calls.opened).toHaveLength(before);
      runs += 1;
    }
    expect(runs).toBe(3);
    expect(calls.commerce).toBe(0);

    const fake = {
      name: commerceDb,
      exec() {
        calls.commerce += 1;
        throw new Error("schema must not run");
      },
      prepare() {
        calls.commerce += 1;
        throw new Error("schema must not run");
      },
    };
    expect(() => createIdempotencyService(fake)).toThrow(/DEV_DB_FORBIDDEN/);
    expect(calls.commerce).toBe(0);
  });

  it("does not write the commerce database when runtime is off, and keeps the ESAT block", async () => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const pusatFile = path.join(dir, "disabled.sqlite");
    commerce.name = commerceName;
    process.env.PUSAT_ORCH_DB = pusatFile;
    const pusat = loadRuntime();
    const opened = calls.opened.length;
    const disabled = await pusat.dispatch({ action: "PING", payload: {}, idempotencyKey: "disabled-key" });
    expect(disabled.result.code).toBe("PUSAT_DISABLED");
    expect(calls.opened.slice(opened)).toEqual([pusatFile]);
    expect(tableNames(pusatFile)).toContain("pusat_idempotency");
    expect(calls.commerce).toBe(0);

    const beforeEsat = calls.opened.length;
    const inspect = await pusat.dispatch({
      action: "ESAT_INSPECT",
      payload: { type: "credential_exfiltration" },
      idempotencyKey: "esat-must-not-store",
    });
    expect(inspect.replayed).toBe(false);
    expect(inspect.result.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(inspect.result.salesOpen).toBe(false);
    expect(inspect.result.egressAllowed).toBe(false);
    expect(inspect.result.productionReady).toBe(false);
    expect(calls.opened).toHaveLength(beforeEsat);
    expect(calls.commerce).toBe(0);
    expect(fs.existsSync(commerceName)).toBe(false);
  });
});

afterAll(() => {
  if (previousRuntime === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
  else process.env.PUSAT_RUNTIME_ENABLED = previousRuntime;
  if (previousOrchDb === undefined) delete process.env.PUSAT_ORCH_DB;
  else process.env.PUSAT_ORCH_DB = previousOrchDb;
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
