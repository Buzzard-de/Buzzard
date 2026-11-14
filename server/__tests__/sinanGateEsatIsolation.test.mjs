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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-sinan-gate-"));
const approvalFile = path.join(dir, "approvals.sqlite");
const orchFile = path.join(dir, "orch.sqlite");
const calls = { exec: 0, prepare: 0, run: 0, opened: [] };

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
    exec() {
      calls.exec += 1;
    },
    prepare() {
      calls.prepare += 1;
      return {
        run() {
          calls.run += 1;
        },
        get() {
          return null;
        },
        all() {
          return [];
        },
      };
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

const humanApproval = require("../lib/pusat/humanApproval.js");
stub("../lib/pusat/humanApproval.js", {
  ...humanApproval,
  createApprovalCenter(options = {}) {
    return humanApproval.createApprovalCenter({
      ...options,
      dbPath: options.dbPath || approvalFile,
    });
  },
});

process.env.PUSAT_RUNTIME_ENABLED = "1";
process.env.PUSAT_ORCH_DB = orchFile;
const pusat = require("../lib/pusat/runtime.js");
const esat = require("../lib/security/esatBey.js");
esat.resetEsat();

describe("SINAN_GATE Esat memory isolation", () => {
  it("records the gate in memory and the synthetic approval queue without commerce writes", () => {
    const gate = pusat.executeReadOnly("SINAN_GATE", { gate: "GIT_PUSH" }, {
      actorId: "sinan_bey",
      correlationId: "corr-sinan-gate",
    });
    expect(gate.ok).toBe(true);
    expect(gate.data.item.status).toBe("WAITING_APPROVAL");
    expect(gate.data.auto).toBe(false);
    expect(gate.data.stored).not.toBe(false);
    expect(calls.exec).toBe(0);
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
    expect(calls.opened).toEqual([approvalFile]);

    const [event] = esat.recent(1);
    expect(event.type).toBe("PERMISSION_DENIED");
    expect(event.action).toBe("ISOLATE_AND_HOLD");
    expect(event.severity).toBe("HIGH");
    expect(event.actor).toBe("sinan_bey");
    expect(event.details.action).toBe("GIT_PUSH");

    const handle = new RealDatabase(approvalFile, { readonly: true, fileMustExist: true });
    const row = handle.prepare(`SELECT status, action, requested_by FROM orch_approvals`).get();
    handle.close();
    expect(row).toEqual({ status: "WAITING_APPROVAL", action: "GIT_PUSH", requested_by: "sinan_bey" });
  });

  it("keeps ESAT_INSPECT blocked before any commerce call", () => {
    const blocked = pusat.executeReadOnly("ESAT_INSPECT", { type: "PERMISSION_DENIED" }, {
      actorId: "sinan_bey",
      correlationId: "corr-esat-inspect",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(blocked.inspected).toBe(false);
    expect(calls.exec).toBe(0);
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
  });

  it("keeps an ordinary Esat inspection in memory and off the commerce mock", () => {
    const verdict = esat.inspect({ type: "ROUTINE_WATCH", actor: "esat_bey", details: { source: "synthetic" } });
    expect(verdict.action).toBe("WATCH");
    expect(verdict.hold).toBe(false);
    expect(calls.exec).toBe(0);
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
    const [event] = esat.recent(1);
    expect(event.type).toBe("ROUTINE_WATCH");
    expect(event.action).toBe("WATCH");
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
