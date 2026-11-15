import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
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
process.env.PUSAT_RUNTIME_ENABLED = "1";

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

const calls = { db: 0, durable: 0, putMemory: 0, openMeeting: 0, holdTrade: 0, requestResearch: 0 };

stub("../lib/db.js", {
  db: {
    prepare() {
      calls.db += 1;
      throw new Error("commerce database must stay closed");
    },
    exec() {
      calls.db += 1;
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
stub("../lib/pusat/durable.js", {
  createDurable() {
    calls.durable += 1;
    return {
      putMemory() {
        calls.putMemory += 1;
        throw new Error("memory write must not run");
      },
      openMeeting() {
        calls.openMeeting += 1;
        throw new Error("meeting write must not run");
      },
      addMeetingEvent() {
        throw new Error("meeting write must not run");
      },
      closeMeeting() {
        throw new Error("meeting write must not run");
      },
      requestResearch() {
        calls.requestResearch += 1;
        throw new Error("research write must not run");
      },
      completeResearch() {
        throw new Error("research write must not run");
      },
      holdTrade() {
        calls.holdTrade += 1;
        throw new Error("trade hold must not run");
      },
      getMemory() {
        return { ok: true, records: [] };
      },
      listHolds() {
        return [];
      },
    };
  },
});

const runtimePath = require.resolve("../lib/pusat/runtime.js");
delete require.cache[runtimePath];
const { executeReadOnly } = require("../lib/pusat/runtime.js");

const writes = [
  ["OPEN_MEETING", { chairId: "pusat" }],
  ["REPORT_MEETING", { meetingId: "meet-synthetic" }],
  ["CLOSE_MEETING", { meetingId: "meet-synthetic" }],
  ["MEMORY_PUT", { key: "note", value: "synthetic" }],
  ["RESEARCH_REQUEST", { topic: "categories", question: "local_only" }],
  ["RESEARCH_COMPLETE", { requestId: "res-synthetic", findings: "none" }],
  ["SCREEN_TRADE", { destination: "DE", reason: "synthetic" }],
];

describe("pusat durable write block", () => {
  it("blocks durable writes before the commerce store opens", () => {
    expect(process.env.PUSAT_RUNTIME_ENABLED).toBe("1");
    for (const [action, payload] of writes) {
      const result = executeReadOnly(action, payload, {
        actorId: "operator@example.com",
        correlationId: `corr-${action}`,
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("LEGACY_PUSAT_DURABLE_WRITE_BLOCKED");
      expect(result.stored).toBe(false);
      expect(result.executed).toBe(false);
      expect(result.salesOpen).toBe(false);
      expect(result.egressAllowed).toBe(false);
      expect(result.productionReady).toBe(false);
    }
    expect(calls).toEqual({ db: 0, durable: 0, putMemory: 0, openMeeting: 0, holdTrade: 0, requestResearch: 0 });
  });

  it("keeps council, memory, and hold reads available", () => {
    const memory = executeReadOnly("MEMORY_GET", { ownerId: "pusat", requesterId: "pusat" }, {
      actorId: "pusat",
      correlationId: "corr-memory",
    });
    expect(memory.ok).toBe(true);
    expect(memory.data.records).toEqual([]);

    const holds = executeReadOnly("LIST_TRADE_HOLDS", {}, { correlationId: "corr-holds" });
    expect(holds.ok).toBe(true);
    expect(holds.data).toEqual([]);

    const ping = executeReadOnly("PING", {}, { correlationId: "corr-ping" });
    expect(ping.ok).toBe(true);
    expect(ping.mode).toBe("DRY_RUN");
    expect(calls.db).toBe(0);
    expect(calls.putMemory).toBe(0);
    expect(calls.holdTrade).toBe(0);
    expect(calls.durable).toBe(1);
  });
});

afterAll(() => {
  if (previousRuntime === undefined) delete process.env.PUSAT_RUNTIME_ENABLED;
  else process.env.PUSAT_RUNTIME_ENABLED = previousRuntime;
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
