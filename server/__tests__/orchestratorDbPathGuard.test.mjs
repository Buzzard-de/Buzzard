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

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const previousRuntime = process.env.PUSAT_RUNTIME_ENABLED;
const previousOrchDb = process.env.PUSAT_ORCH_DB;
const calls = { sqlite: 0, orchestrator: 0 };

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}

stub("../lib/db.js", {
  db: {
    prepare() {
      throw new Error("commerce database must stay closed");
    },
    exec() {
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
stub("../lib/pusat/durable.js", {
  createDurable() {
    return {
      getMemory() {
        return { ok: true, records: [] };
      },
      listHolds() {
        return [];
      },
    };
  },
});

const serverRequire = createRequire(path.join(repoRoot, "server/package.json"));
const sqliteId = serverRequire.resolve("better-sqlite3");
function FakeDatabase() {
  calls.sqlite += 1;
  throw new Error("sqlite must not open");
}
require.cache[sqliteId] = { id: sqliteId, filename: sqliteId, loaded: true, exports: FakeDatabase };

const { assertNotGuardian, createDurableTaskQueue } = require("../lib/pusat/durableTaskQueue.js");
const orch = require("../lib/pusat/orchRuntime.js");
orch.getOrchestrator = function countingOrchestrator() {
  calls.orchestrator += 1;
  return {
    approvals: {
      decide() {
        return { ok: true, changed: false };
      },
    },
    status() {
      return { live: false, hostedFactory: false };
    },
  };
};

process.env.PUSAT_RUNTIME_ENABLED = "1";
delete process.env.PUSAT_ORCH_DB;
const runtimePath = require.resolve("../lib/pusat/runtime.js");
delete require.cache[runtimePath];
const { executeReadOnly } = require("../lib/pusat/runtime.js");

const safePath = path.join(os.tmpdir(), "buzzard-pusat-orch.sqlite");
const commercePath = path.join(repoRoot, "server/data/buzzard.db");
const guardianPath = path.join(os.tmpdir(), "buzzard_guardian_copy.sqlite");

function refused(action, dbPath) {
  return executeReadOnly(action, { dbPath, approvalId: "apr-synthetic" }, {
    actorId: "operator@example.com",
    correlationId: `corr-${action}`,
    sessionRole: "administrator",
  });
}

describe("pusat orchestrator database path guard", () => {
  it("rejects commerce and guardian paths before any database opens", () => {
    expect(() => orch.resolveDbPath("buzzard.db")).toThrow(/DEV_DB_FORBIDDEN/);
    expect(() => orch.resolveDbPath(commercePath)).toThrow(/DEV_DB_FORBIDDEN/);
    expect(() => assertNotGuardian(guardianPath)).toThrow(/GUARDIAN_SQLITE_FORBIDDEN/);
    expect(() => orch.resolveDbPath(guardianPath)).toThrow(/GUARDIAN_SQLITE_FORBIDDEN/);
    expect(() => createDurableTaskQueue({ dbPath: commercePath })).toThrow(/DEV_DB_FORBIDDEN/);
    expect(() => createDurableTaskQueue({ dbPath: "buzzard.db" })).toThrow(/DEV_DB_FORBIDDEN/);
    expect(() => createDurableTaskQueue({ dbPath: guardianPath })).toThrow(/GUARDIAN_SQLITE_FORBIDDEN/);
    expect(calls.sqlite).toBe(0);

    for (const action of ["ORCHESTRATE_APPROVE", "ORCHESTRATE_STATUS"]) {
      for (const dbPath of ["buzzard.db", commercePath, guardianPath]) {
        const result = refused(action, dbPath);
        expect(result.ok).toBe(false);
        expect(result.code).toBe("DATA_PATH_REFUSED");
        expect(result.salesOpen).toBe(false);
        expect(result.egressAllowed).toBe(false);
        expect(result.productionReady).toBe(false);
      }
    }
    expect(calls.orchestrator).toBe(0);
    expect(calls.sqlite).toBe(0);
  });

  it("rejects a protected path supplied through PUSAT_ORCH_DB", () => {
    process.env.PUSAT_ORCH_DB = commercePath;
    expect(() => orch.resolveDbPath()).toThrow(/DEV_DB_FORBIDDEN/);
    expect(() => orch.resolveDbPath("")).toThrow(/DEV_DB_FORBIDDEN/);
    const approve = refused("ORCHESTRATE_APPROVE", undefined);
    const status = refused("ORCHESTRATE_STATUS", undefined);
    expect(approve.code).toBe("DATA_PATH_REFUSED");
    expect(status.code).toBe("DATA_PATH_REFUSED");
    expect(calls.orchestrator).toBe(0);
    expect(calls.sqlite).toBe(0);
    delete process.env.PUSAT_ORCH_DB;
  });

  it("accepts the temporary orchestrator path without opening sqlite", () => {
    delete process.env.PUSAT_ORCH_DB;
    const resolved = orch.resolveDbPath(safePath);
    expect(resolved).toBe(path.resolve(safePath));
    expect(path.basename(resolved)).not.toBe("buzzard.db");
    const approve = refused("ORCHESTRATE_APPROVE", safePath);
    const status = refused("ORCHESTRATE_STATUS", safePath);
    expect(approve.ok).toBe(true);
    expect(status.ok).toBe(true);
    expect(status.data.live).toBe(false);
    expect(calls.orchestrator).toBe(2);
    expect(calls.sqlite).toBe(0);
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
