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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-esat-commerce-"));
const approvalFile = path.join(dir, "approvals.sqlite");
const orchFile = path.join(dir, "orch.sqlite");
const calls = { exec: 0, prepare: 0, run: 0, opened: [] };
const bus = { emits: 0 };

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
      throw new Error("commerce database must stay closed");
    },
    prepare() {
      calls.prepare += 1;
      throw new Error("commerce database must stay closed");
    },
  },
});
stub("../lib/exceptionBus.js", {
  TYPES: { PERMISSION_DENIED: "PERMISSION_DENIED", SECURITY_ALERT: "SECURITY_ALERT" },
  emit() {
    bus.emits += 1;
    throw new Error("exception bus must stay closed");
  },
  list() {
    return [];
  },
  get() {
    return null;
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
const esat = require("../lib/security/esatBey.js");
esat.resetEsat();
const pusat = require("../lib/pusat/runtime.js");

describe("Esat and Pusat write denial stay off the commerce database", () => {
  it("keeps watch paths in memory and refuses commerce persistence", () => {
    const inspected = esat.inspect({
      type: "credential_exfiltration",
      actor: "esat_bey",
      details: { path: "/tmp/synthetic" },
    });
    expect(inspected.hold).toBe(true);
    expect(inspected.action).toBe("ISOLATE_AND_HOLD");
    expect(inspected.severity).toBe("HIGH");

    const watched = esat.inspect({ type: "ROUTINE_WATCH", actor: "esat_bey", details: { source: "synthetic" } });
    expect(watched.action).toBe("WATCH");
    expect(watched.severity).toBe("MEDIUM");
    expect(watched.hold).toBe(false);

    const egress = esat.watchEgress(
      { allowed: false, code: "EXTERNAL_AI_EGRESS_DENIED", host: "example.test" },
      { url: "https://example.test/synthetic" },
    );
    expect(egress.hold).toBe(true);
    expect(egress.action).toBe("ISOLATE_AND_HOLD");

    const payment = esat.watchPaymentCapture("synthetic-payment");
    expect(payment.hold).toBe(true);
    expect(payment.severity).toBe("HIGH");

    const exception = esat.watchException({ type: "PERMISSION_DENIED", severity: "HIGH", source: "synthetic" });
    expect(exception.hold).toBe(true);

    const sales = esat.watchSalesAttempt({ envWantsSales: true, allowed: false, failed: ["SALES"] });
    expect(sales.hold).toBe(true);
    expect(sales.action).toBe("ISOLATE_AND_HOLD");

    const secret = esat.scanText("aws_secret_access_key synthetic", { actor: "esat_bey" });
    expect(secret.safe).toBe(false);
    expect(secret.hold).toBe(true);

    const memoryOnly = esat.inspect({
      type: "PERMISSION_DENIED",
      actor: "sinan_bey",
      details: { action: "GIT_PUSH" },
      memoryOnly: true,
    });
    expect(memoryOnly.action).toBe("ISOLATE_AND_HOLD");

    const types = esat.recent(20).map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining([
      "credential_exfiltration",
      "ROUTINE_WATCH",
      "EXTERNAL_AI_EGRESS_DENIED",
      "PAYMENT_CAPTURE",
      "PERMISSION_DENIED",
      "SALES_UNLOCK_ATTEMPT",
      "SECRET_IN_MESSAGE",
    ]));
    expect(calls.exec).toBe(0);
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
    expect(bus.emits).toBe(0);
    expect(calls.opened).toEqual([]);
  });

  it("denies Pusat write actions before exceptionBus persistence", () => {
    const before = esat.recent(50).length;
    for (const action of ["CREATE_ORDER", "SET_PRICE", "CAPTURE_PAYMENT", "ISSUE_REFUND"]) {
      const denied = pusat.executeReadOnly(action, { id: "synthetic" }, {
        actorId: "esat_bey",
        correlationId: `corr-${action}`,
      });
      expect(denied.ok).toBe(false);
      expect(denied.code).toBe("PERMISSION_DENIED");
      expect(denied.action).toBe(action);
      expect(denied.mode).toBe("DISABLED");
    }
    expect(bus.emits).toBe(0);
    expect(calls.exec).toBe(0);
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
    const deniedEvents = esat.recent(20).filter((event) => event.details && event.details.source === "pusat");
    expect(deniedEvents).toHaveLength(4);
    expect(deniedEvents.map((event) => event.details.action).sort()).toEqual([
      "CAPTURE_PAYMENT",
      "CREATE_ORDER",
      "ISSUE_REFUND",
      "SET_PRICE",
    ]);
    expect(deniedEvents.every((event) => event.type === "PERMISSION_DENIED" && event.severity === "HIGH" && event.action === "ISOLATE_AND_HOLD")).toBe(true);
    expect(esat.recent(50).length).toBe(before + 4);
  });

  it("keeps ESAT_INSPECT blocked and SINAN_GATE in memory", () => {
    const blocked = pusat.executeReadOnly("ESAT_INSPECT", { type: "PAYMENT_CAPTURE" }, {
      actorId: "esat_bey",
      correlationId: "corr-inspect",
    });
    expect(blocked.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(blocked.inspected).toBe(false);
    expect(bus.emits).toBe(0);

    const gate = pusat.executeReadOnly("SINAN_GATE", { gate: "GIT_PUSH" }, {
      actorId: "sinan_bey",
      correlationId: "corr-gate",
    });
    expect(gate.ok).toBe(true);
    expect(gate.data.item.status).toBe("WAITING_APPROVAL");
    const [event] = esat.recent(1);
    expect(event.type).toBe("PERMISSION_DENIED");
    expect(event.actor).toBe("sinan_bey");
    expect(event.details.action).toBe("GIT_PUSH");
    expect(calls.exec).toBe(0);
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
    expect(bus.emits).toBe(0);
    expect(calls.opened).toEqual([approvalFile]);
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
