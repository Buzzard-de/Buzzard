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
const previousSales = process.env.BUZZARD_SALES_ENABLED;
const previousBypass = process.env.BUZZARD_SALES_GATE_BYPASS;
const previousDbPath = process.env.BUZZARD_DB_PATH;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-exception-bus-"));
const calls = { prepare: 0, run: 0, exec: 0 };

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

delete process.env.BUZZARD_SALES_ENABLED;
delete process.env.BUZZARD_SALES_GATE_BYPASS;
delete process.env.BUZZARD_DB_PATH;
const exceptions = require("../lib/exceptionBus.js");

function callerEmit(type, source) {
  return exceptions.emit({
    type: exceptions.TYPES[type],
    severity: "HIGH",
    source,
    entity: "synthetic",
    entityId: "synthetic-id",
    message: `${source} closed`,
    context: { email: "buyer@example.com", host: "example.test" },
    retryable: false,
  });
}

describe("exceptionBus commerce isolation", () => {
  it("keeps caller events in memory while sales are closed", () => {
    const callers = [
      ["SECURITY_ALERT", "egress_guard"],
      ["CHECKOUT_INVALID", "checkoutService"],
      ["SUPPLIER_NOT_LIVE", "orderService"],
      ["PAYMENT_NOT_LIVE", "paymentService"],
      ["ORDER_IDEMPOTENCY_CONFLICT", "idempotency"],
      ["PRODUCT_WRITE_BLOCKED", "productSot"],
      ["PRODUCT_IDENTITY_CONFLICT", "productCollisionDetector"],
      ["FULFILLMENT_NOT_LIVE", "carrier_selection"],
      ["PRICE_CONFLICT", "coreEngineChain"],
      ["CHECKOUT_VALIDATION_FAILED", "coreEngineChain"],
      ["ORDER_PREPARATION_FAILED", "coreEngineChain"],
      ["PRODUCT_NOT_FOUND", "canonicalCommercePath"],
      ["PRICE_INVALID", "canonicalCommercePath"],
    ];
    const emitted = callers.map(([type, source]) => callerEmit(type, source));
    expect(emitted.every((event) => event.status === "OPEN" && event.persisted === false && event.code === "SALES_CLOSED")).toBe(true);
    expect(emitted.every((event) => event.context_json.includes("[redacted]") && !event.context_json.includes("buyer@example.com"))).toBe(true);
    expect(exceptions.get(emitted[0].id).source).toBe("egress_guard");
    expect(exceptions.list({ status: "OPEN", limit: 20 }).map((event) => event.type)).toEqual(
      expect.arrayContaining(callers.map(([type]) => type)),
    );
    expect(calls.prepare).toBe(0);
    expect(calls.run).toBe(0);
    expect(calls.exec).toBe(0);
    expect(() => exceptions.emit({ type: "NOT_A_TYPE" })).toThrow(/Unknown exception type/);
    expect(calls.prepare).toBe(0);
  });

  it("refuses a protected database path when the sales flag is on", () => {
    const before = calls.prepare;
    process.env.BUZZARD_SALES_ENABLED = "1";
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
    process.env.BUZZARD_DB_PATH = commerceDb;
    const named = exceptions.emit({
      type: exceptions.TYPES.SECURITY_ALERT,
      source: "egress_guard",
      message: "protected name",
    });
    expect(named.persisted).toBe(false);
    expect(named.code).toBe("EXCEPTION_DB_PATH_REFUSED");
    expect(exceptions.get(named.id).memory).toBe(true);

    const dataFile = path.join(dir, "server-data-name.sqlite");
    const nested = path.join(dir, "server", "data");
    fs.mkdirSync(nested, { recursive: true });
    process.env.BUZZARD_DB_PATH = path.join(nested, "custom.sqlite");
    const underData = exceptions.emit({
      type: exceptions.TYPES.PAYMENT_NOT_LIVE,
      source: "paymentService",
      message: "protected parent",
    });
    expect(underData.code).toBe("EXCEPTION_DB_PATH_REFUSED");
    expect(fs.existsSync(dataFile)).toBe(false);

    const link = path.join(dir, "commerce-link.sqlite");
    fs.symlinkSync(commerceDb, link);
    process.env.BUZZARD_DB_PATH = link;
    const linked = exceptions.emit({
      type: exceptions.TYPES.FULFILLMENT_NOT_LIVE,
      source: "carrier_selection",
      message: "protected link",
    });
    expect(linked.persisted).toBe(false);
    expect(linked.code).toBe("EXCEPTION_DB_PATH_REFUSED");

    const broken = path.join(dir, "broken-link.sqlite");
    fs.symlinkSync(path.join(dir, "missing-target.sqlite"), broken);
    process.env.BUZZARD_DB_PATH = broken;
    const dangling = exceptions.emit({
      type: exceptions.TYPES.PRODUCT_NOT_FOUND,
      source: "canonicalCommercePath",
      message: "broken link",
    });
    expect(dangling.code).toBe("EXCEPTION_DB_PATH_REFUSED");
    expect(calls.prepare).toBe(before);
    expect(calls.run).toBe(before);
    expect(calls.exec).toBe(0);
  });

  it("uses only an isolated database mock when sales are open and the path is safe", () => {
    const safe = path.join(dir, "exceptions.sqlite");
    process.env.BUZZARD_SALES_ENABLED = "1";
    process.env.BUZZARD_SALES_GATE_BYPASS = "1";
    process.env.BUZZARD_DB_PATH = safe;
    const before = calls.prepare;
    const stored = exceptions.emit({
      type: exceptions.TYPES.DATA_INCONSISTENCY,
      source: "isolated-mock",
      message: "safe path",
      context: { email: "buyer@example.com" },
    });
    expect(stored.persisted).toBe(true);
    expect(stored.code).toBe(null);
    expect(stored.context_json).not.toContain("buyer@example.com");
    expect(calls.prepare).toBe(before + 1);
    expect(calls.run).toBe(1);
    expect(calls.exec).toBe(0);
    expect(fs.existsSync(safe)).toBe(false);

    delete process.env.BUZZARD_SALES_ENABLED;
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    const closedAgain = exceptions.emit({
      type: exceptions.TYPES.SECURITY_ALERT,
      source: "egress_guard",
      message: "sales closed again",
    });
    expect(closedAgain.code).toBe("SALES_CLOSED");
    expect(closedAgain.persisted).toBe(false);
    expect(calls.prepare).toBe(before + 1);
    expect(exceptions.list({ limit: 5 })[0].id).toBe(closedAgain.id);
  });
});

afterAll(() => {
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (previousBypass === undefined) delete process.env.BUZZARD_SALES_GATE_BYPASS;
  else process.env.BUZZARD_SALES_GATE_BYPASS = previousBypass;
  if (previousDbPath === undefined) delete process.env.BUZZARD_DB_PATH;
  else process.env.BUZZARD_DB_PATH = previousDbPath;
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
