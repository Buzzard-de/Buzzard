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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-sinan-iso-"));
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

function loadRuntime() {
  const runtimePath = require.resolve("../lib/pusat/runtime.js");
  delete require.cache[runtimePath];
  return require("../lib/pusat/runtime.js");
}

function tableNames(file) {
  if (!fs.existsSync(file)) return [];
  const handle = new RealDatabase(file, { readonly: true, fileMustExist: true });
  try {
    return handle.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all().map((row) => row.name);
  } finally {
    handle.close();
  }
}

describe("sinan agent database isolation", () => {
  it("keeps read-only Sinan calls off the commerce database and writes only to the isolated file", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const pusatFile = path.join(dir, "sinan.sqlite");
    commerce.name = commerceName;
    process.env.PUSAT_ORCH_DB = pusatFile;
    const pusat = loadRuntime();
    const opened = calls.opened.length;

    const profile = pusat.executeReadOnly("SINAN_PROFILE", {}, { actorId: "pusat", correlationId: "corr-profile" });
    expect(profile.ok).toBe(true);
    expect(profile.data.id).toBe("sinan_bey");
    expect(profile.data.productionWrite).toBe(false);
    const status = pusat.executeReadOnly("SINAN_STATUS", {}, { actorId: "sinan_bey", correlationId: "corr-status" });
    expect(status.ok).toBe(true);
    expect(status.data.tasks).toEqual([]);
    expect(status.data.liveVerified).toBe(false);
    const analysis = pusat.executeReadOnly("SINAN_ANALYZE", { domain: "pusat_orchestrator" }, {
      actorId: "sinan_bey",
      correlationId: "corr-analyze",
    });
    expect(analysis.data.productionMutation).toBe(false);
    expect(calls.opened).toHaveLength(opened);
    expect(fs.existsSync(pusatFile)).toBe(false);

    const assigned = pusat.executeReadOnly("SINAN_ASSIGN", { title: "review-order-engine" }, {
      actorId: "pusat",
      correlationId: "corr-assign",
    });
    expect(assigned.ok).toBe(true);
    expect(assigned.data.id).toMatch(/^stask_/);
    expect(calls.opened.slice(opened)).toEqual([pusatFile]);
    expect(tableNames(pusatFile)).toEqual(["sinan_audit", "sinan_memory_versions", "sinan_reports", "sinan_tasks"]);

    const accepted = pusat.executeReadOnly("SINAN_ACCEPT", { taskId: assigned.data.id }, {
      actorId: "sinan_bey",
      correlationId: "corr-accept",
    });
    expect(accepted.data.status).toBe("IN_PROGRESS");
    const reported = pusat.executeReadOnly("SINAN_REPORT", {
      taskId: assigned.data.id,
      status: "TESTED",
      testResult: "unit-pass",
      body: { note: "synthetic" },
    }, { actorId: "sinan_bey", correlationId: "corr-report" });
    expect(reported.data.liveVerified).toBe(false);
    expect(reported.data.testedIsNotLive).toBe(true);

    const handle = new RealDatabase(pusatFile, { readonly: true, fileMustExist: true });
    const task = handle.prepare(`SELECT status, title FROM sinan_tasks WHERE id = ?`).get(assigned.data.id);
    const reports = handle.prepare(`SELECT COUNT(*) AS n FROM sinan_reports`).get().n;
    handle.close();
    expect(task).toEqual({ status: "TESTED", title: "review-order-engine" });
    expect(reports).toBe(1);
    expect(calls.opened.filter((file) => file !== pusatFile)).toEqual([]);
    expect(calls.commerce).toBe(0);
    expect(fs.existsSync(commerceName)).toBe(false);
  });

  it("refuses a shared or protected path before sqlite opens", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const shared = path.join(dir, "same-file.sqlite");
    commerce.name = shared;
    process.env.PUSAT_ORCH_DB = shared;
    const same = loadRuntime();
    const opened = calls.opened.length;
    const profile = same.executeReadOnly("SINAN_PROFILE", {}, { actorId: "pusat", correlationId: "corr-same-profile" });
    const assigned = same.executeReadOnly("SINAN_ASSIGN", { title: "must-not-store" }, { actorId: "pusat", correlationId: "corr-same" });
    expect(profile.ok).toBe(true);
    expect(assigned.ok).toBe(true);
    expect(assigned.data.ok).toBe(false);
    expect(assigned.data.code).toBe("DATA_PATH_REFUSED");
    expect(assigned.data.stored).toBe(false);
    expect(calls.opened).toHaveLength(opened);
    expect(fs.existsSync(shared)).toBe(false);

    for (const blocked of [commerceDb, path.join(repoRoot, "server/data/custom.sqlite"), path.join(dir, "buzzard_guardian_sinan.sqlite")]) {
      process.env.PUSAT_ORCH_DB = blocked;
      const guarded = loadRuntime();
      const before = calls.opened.length;
      const result = guarded.executeReadOnly("SINAN_ASSIGN", { title: "blocked" }, { actorId: "pusat", correlationId: "corr-blocked" });
      expect(result.data.stored).toBe(false);
      expect(["DATA_PATH_REFUSED", "GUARDIAN_SQLITE_FORBIDDEN"]).toContain(result.data.code);
      expect(calls.opened).toHaveLength(before);
    }
    expect(calls.commerce).toBe(0);
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
