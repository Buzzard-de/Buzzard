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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-sinan-path-"));
const calls = { opened: [] };

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

stub("../lib/db.js", {
  db: {
    name: path.join(dir, "commerce-name.sqlite"),
    exec() {
      throw new Error("commerce database must stay closed");
    },
    prepare() {
      throw new Error("commerce database must stay closed");
    },
  },
});
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

function loadRuntime() {
  const runtimePath = require.resolve("../lib/pusat/runtime.js");
  delete require.cache[runtimePath];
  return require("../lib/pusat/runtime.js");
}

function taskCount(file) {
  if (!fs.existsSync(file)) return 0;
  const handle = new RealDatabase(file, { readonly: true, fileMustExist: true });
  try {
    const table = handle.prepare(
      `SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'sinan_tasks'`
    ).get();
    if (!table) return 0;
    return handle.prepare(`SELECT COUNT(*) AS n FROM sinan_tasks`).get().n;
  } finally {
    handle.close();
  }
}

describe("sinan database path cache", () => {
  it("rechecks PUSAT_ORCH_DB inside one process and does not reuse the old connection", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    process.env.PUSAT_ORCH_DB = commerceDb;
    const pusat = loadRuntime();
    const blockedFirst = pusat.executeReadOnly("SINAN_ASSIGN", { title: "before-safe" }, {
      actorId: "pusat",
      correlationId: "corr-blocked-first",
    });
    expect(blockedFirst.data.stored).toBe(false);
    expect(["DATA_PATH_REFUSED", "GUARDIAN_SQLITE_FORBIDDEN"]).toContain(blockedFirst.data.code);
    expect(calls.opened).toEqual([]);

    const safeA = path.join(dir, "sinan-a.sqlite");
    process.env.PUSAT_ORCH_DB = safeA;
    const first = pusat.executeReadOnly("SINAN_ASSIGN", { title: "safe-a" }, {
      actorId: "pusat",
      correlationId: "corr-safe-a",
    });
    const second = pusat.executeReadOnly("SINAN_ASSIGN", { title: "safe-a-again" }, {
      actorId: "pusat",
      correlationId: "corr-safe-a-2",
    });
    expect(first.data.id).toMatch(/^stask_/);
    expect(second.data.id).toMatch(/^stask_/);
    expect(calls.opened).toEqual([safeA]);
    expect(taskCount(safeA)).toBe(2);

    process.env.PUSAT_ORCH_DB = commerceDb;
    const blocked = pusat.executeReadOnly("SINAN_ASSIGN", { title: "must-not-reuse" }, {
      actorId: "pusat",
      correlationId: "corr-blocked-later",
    });
    expect(blocked.data.stored).toBe(false);
    expect(["DATA_PATH_REFUSED", "GUARDIAN_SQLITE_FORBIDDEN"]).toContain(blocked.data.code);
    expect(calls.opened).toEqual([safeA]);
    expect(taskCount(safeA)).toBe(2);

    const safeB = path.join(dir, "sinan-b.sqlite");
    process.env.PUSAT_ORCH_DB = safeB;
    const moved = pusat.executeReadOnly("SINAN_ASSIGN", { title: "safe-b" }, {
      actorId: "pusat",
      correlationId: "corr-safe-b",
    });
    expect(moved.data.id).toMatch(/^stask_/);
    expect(calls.opened).toEqual([safeA, safeB]);
    expect(taskCount(safeA)).toBe(2);
    expect(taskCount(safeB)).toBe(1);

    const inspect = pusat.executeReadOnly("ESAT_INSPECT", { type: "PERMISSION_DENIED" }, {
      actorId: "sinan_bey",
      correlationId: "corr-esat",
    });
    expect(inspect.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(calls.opened).toEqual([safeA, safeB]);
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
