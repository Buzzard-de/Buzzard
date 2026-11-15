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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-pusat-memory-"));
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
    return { status: "OBSERVER", exclusive: false };
  },
});
stub("../lib/commerce/inventoryIntegration.js", {});
stub("../lib/commerce/pricingIntegration.js", {});
stub("../lib/pusat/idempotencyService.js", {
  createIdempotencyService() {
    throw new Error("idempotency must not open");
  },
});

const { referencedTables } = require("../lib/pusat/durable.js");

function loadRuntime() {
  const runtimePath = require.resolve("../lib/pusat/runtime.js");
  delete require.cache[runtimePath];
  return require("../lib/pusat/runtime.js");
}

function userTables(file) {
  const handle = new RealDatabase(file, { readonly: true, fileMustExist: true });
  try {
    return handle.prepare(
      `SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    ).all();
  } finally {
    handle.close();
  }
}

const writes = [
  ["OPEN_MEETING", { chairId: "pusat" }],
  ["REPORT_MEETING", { meetingId: "meet-synthetic" }],
  ["CLOSE_MEETING", { meetingId: "meet-synthetic" }],
  ["MEMORY_PUT", { key: "note", value: "synthetic" }],
  ["RESEARCH_REQUEST", { topic: "categories", question: "local_only" }],
  ["RESEARCH_COMPLETE", { requestId: "res-synthetic", findings: "none" }],
  ["SCREEN_TRADE", { destination: "DE", reason: "synthetic" }],
];

describe("pusat durable memory stays off the commerce database", () => {
  it("reads from an isolated file and does not create a missing holds table", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusatFile = path.join(dir, "pusat-memory.sqlite");
    process.env.PUSAT_ORCH_DB = pusatFile;
    commerce.name = commerceName;
    const pusat = loadRuntime();
    const opened = calls.opened.length;

    const council = pusat.executeReadOnly("GET_COUNCIL", {}, { correlationId: "corr-council" });
    expect(council.ok).toBe(true);
    expect(Array.isArray(council.data)).toBe(true);
    expect(calls.opened).toHaveLength(opened);
    expect(calls.commerce).toBe(0);

    const holds = pusat.executeReadOnly("LIST_TRADE_HOLDS", {}, { correlationId: "corr-holds" });
    expect(holds.ok).toBe(false);
    expect(holds.code).toBe("PUSAT_TABLE_MISSING");
    expect(holds.salesOpen).toBe(false);
    expect(holds.egressAllowed).toBe(false);
    expect(holds.productionReady).toBe(false);
    expect(calls.opened).toEqual([pusatFile]);
    expect(userTables(pusatFile)).toEqual([]);

    const memory = pusat.executeReadOnly("MEMORY_GET", { ownerId: "pusat", requesterId: "pusat" }, {
      actorId: "pusat",
      correlationId: "corr-memory",
    });
    expect(memory.ok).toBe(false);
    expect(memory.code).toBe("PUSAT_TABLE_MISSING");
    expect(calls.opened).toEqual([pusatFile]);
    expect(calls.commerce).toBe(0);
    expect(fs.existsSync(commerceName)).toBe(false);
  });

  it("uses a prepared isolated holds table without schema writes", () => {
    const pusatFile = path.join(dir, "pusat-seeded.sqlite");
    const seed = new RealDatabase(pusatFile);
    seed.exec(`
      CREATE TABLE pusat_trade_holds (
        id TEXT PRIMARY KEY,
        destination TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO pusat_trade_holds VALUES (
        'hold_synthetic', 'DE', 'synthetic', 'WAITING_APPROVAL', '{}', '2026-01-01T00:00:00.000Z'
      );
    `);
    seed.close();
    const before = userTables(pusatFile);
    process.env.PUSAT_ORCH_DB = pusatFile;
    const opened = calls.opened.length;
    const pusat = loadRuntime();
    const holds = pusat.executeReadOnly("LIST_TRADE_HOLDS", {}, { correlationId: "corr-seed" });
    expect(holds.ok).toBe(true);
    expect(holds.data[0].id).toBe("hold_synthetic");
    expect(userTables(pusatFile)).toEqual(before);
    expect(calls.opened.slice(opened)).toEqual([pusatFile]);
    expect(calls.commerce).toBe(0);
  });

  it("does not open a database when the pusat path is the commerce file", () => {
    const shared = path.join(dir, "same-file.sqlite");
    commerce.name = shared;
    process.env.PUSAT_ORCH_DB = shared;
    const opened = calls.opened.length;
    const pusat = loadRuntime();
    const memory = pusat.executeReadOnly("MEMORY_GET", { ownerId: "pusat", requesterId: "pusat" }, {
      actorId: "pusat",
      correlationId: "corr-same",
    });
    const holds = pusat.executeReadOnly("LIST_TRADE_HOLDS", {}, { correlationId: "corr-same-holds" });
    expect(memory.code).toBe("DATA_PATH_REFUSED");
    expect(holds.code).toBe("DATA_PATH_REFUSED");
    expect(memory.salesOpen).toBe(false);
    expect(calls.opened).toHaveLength(opened);
    expect(fs.existsSync(shared)).toBe(false);
    expect(calls.commerce).toBe(0);

    process.env.PUSAT_ORCH_DB = commerceDb;
    const guarded = loadRuntime();
    const refused = guarded.executeReadOnly("ORCHESTRATE_STATUS", {}, { correlationId: "corr-commerce-path" });
    expect(refused.code).toBe("DATA_PATH_REFUSED");
    expect(calls.opened).toHaveLength(opened);
    expect(calls.commerce).toBe(0);
  });

  it("keeps durable write locks and leaves orchestrator status off the commerce file", () => {
    const pusatFile = path.join(dir, "pusat-status.sqlite");
    const orchFile = path.join(dir, "orch-status.sqlite");
    commerce.name = commerceName;
    process.env.PUSAT_ORCH_DB = pusatFile;
    const pusat = loadRuntime();
    const opened = calls.opened.length;
    for (const [action, payload] of writes) {
      const result = pusat.executeReadOnly(action, payload, {
        actorId: "operator@example.com",
        correlationId: `corr-${action}`,
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("LEGACY_PUSAT_DURABLE_WRITE_BLOCKED");
      expect(result.stored).toBe(false);
      expect(result.salesOpen).toBe(false);
      expect(result.egressAllowed).toBe(false);
      expect(result.productionReady).toBe(false);
    }
    expect(calls.opened).toHaveLength(opened);

    const status = pusat.executeReadOnly("ORCHESTRATE_STATUS", { dbPath: orchFile }, { correlationId: "corr-status" });
    expect(status.ok).toBe(true);
    expect(status.data.live).toBe(false);
    expect(calls.opened.slice(opened)).toEqual([orchFile]);
    expect(calls.commerce).toBe(0);
    expect(fs.existsSync(pusatFile)).toBe(false);
    expect(fs.existsSync(commerceName)).toBe(false);
  });

  it("rejects commerce tables on the pusat memory connection", () => {
    expect(() => referencedTables("SELECT * FROM orders")).toThrow(/PUSAT_TABLE_FORBIDDEN/);
    expect(() => referencedTables("CREATE TABLE commerce_orders (id TEXT)")).toThrow(/PUSAT_TABLE_FORBIDDEN/);
    expect(() => referencedTables("SELECT id FROM pusat_trade_holds")).not.toThrow();
    expect(() => referencedTables("SELECT 1 FROM sqlite_master WHERE name = ?")).not.toThrow();
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
