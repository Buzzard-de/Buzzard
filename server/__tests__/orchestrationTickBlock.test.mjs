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

const calls = {
  db: 0,
  getOrchestrator: 0,
  schedule: 0,
  tick: 0,
  coordinateCouncil: 0,
  specialistDispatch: 0,
  createOrchestrator: 0,
};

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
stub("../lib/pusat/orchRuntime.js", {
  getOrchestrator() {
    calls.getOrchestrator += 1;
    return {
      schedule() {
        calls.schedule += 1;
      },
      tick() {
        calls.tick += 1;
        return { executed: [] };
      },
      coordinateCouncil() {
        calls.coordinateCouncil += 1;
        return { ran: [] };
      },
      status() {
        return { queued: 0, inMemory: false, hostedFactory: false };
      },
      queue: { dbPath: "synthetic-must-not-open" },
    };
  },
});
stub("../lib/pusat/orchestrator.js", {
  createOrchestrator() {
    calls.createOrchestrator += 1;
    throw new Error("orchestrator must not be constructed");
  },
});
stub("../lib/buzzardNative/core/specialistDispatch.js", {
  dispatch() {
    calls.specialistDispatch += 1;
    throw new Error("specialistDispatch must not run");
  },
});

const runtimePath = require.resolve("../lib/pusat/runtime.js");
delete require.cache[runtimePath];
const { executeReadOnly, dispatch } = require("../lib/pusat/runtime.js");

function tickPayload(extra = {}) {
  return {
    dbPath: "/tmp/synthetic-orch.sqlite",
    schedule: {
      title: "synthetic",
      assigneeId: "pricing_ai",
      ownerId: "pusat",
      kind: "THINK",
      needsApproval: false,
    },
    coordinate: true,
    kind: "ASSIGN_TASK",
    limit: 17,
    ...extra,
  };
}

describe("legacy orchestration tick block", () => {
  it("blocks ORCHESTRATE_TICK while the runtime flag is on", async () => {
    expect(process.env.PUSAT_RUNTIME_ENABLED).toBe("1");
    const direct = executeReadOnly("ORCHESTRATE_TICK", tickPayload(), {
      actorId: "operator@example.com",
      correlationId: "corr-tick",
      sessionRole: "administrator",
    });
    expect(direct.ok).toBe(false);
    expect(direct.code).toBe("LEGACY_ORCHESTRATION_TICK_BLOCKED");
    expect(direct.executed).toBe(false);
    expect(direct.scheduled).toBe(false);
    expect(direct.salesOpen).toBe(false);
    expect(direct.egressAllowed).toBe(false);
    expect(direct.productionReady).toBe(false);

    const wrapped = await dispatch({
      action: "ORCHESTRATE_TICK",
      payload: tickPayload({ coordinate: false, schedule: { title: "direct-tick", needsApproval: false } }),
      actorId: "operator@example.com",
      correlationId: "corr-dispatch",
    });
    expect(wrapped.replayed).toBe(false);
    expect(wrapped.result.code).toBe("LEGACY_ORCHESTRATION_TICK_BLOCKED");
    expect(calls).toEqual({
      db: 0,
      getOrchestrator: 0,
      schedule: 0,
      tick: 0,
      coordinateCouncil: 0,
      specialistDispatch: 0,
      createOrchestrator: 0,
    });
  });

  it("keeps unrelated read-only actions available", () => {
    const ping = executeReadOnly("PING", {}, { actorId: "operator@example.com", correlationId: "corr-ping" });
    expect(ping.ok).toBe(true);
    expect(ping.action).toBe("PING");
    expect(ping.mode).toBe("DRY_RUN");
    expect(ping.live).toBe(false);

    const sot = executeReadOnly("GET_SOT_STATUS", {}, { correlationId: "corr-sot" });
    expect(sot.ok).toBe(true);
    expect(sot.data).toEqual({ status: "OBSERVER", exclusive: false });
    expect(calls.getOrchestrator).toBe(0);
    expect(calls.schedule).toBe(0);
    expect(calls.tick).toBe(0);
    expect(calls.coordinateCouncil).toBe(0);
    expect(calls.specialistDispatch).toBe(0);
    expect(calls.db).toBe(0);
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
