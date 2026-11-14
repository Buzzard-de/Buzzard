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

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

const calls = { inspect: 0, persist: 0, durable: 0, idempotency: 0, db: 0, httpDispatch: 0 };

stub("../lib/db.js", {
  db: {
    exec() {
      calls.persist += 1;
      calls.db += 1;
    },
    prepare() {
      calls.db += 1;
      return {
        run() {
          calls.db += 1;
        },
        get() {
          calls.db += 1;
          return null;
        },
        all() {
          calls.db += 1;
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
stub("../lib/pusat/durable.js", {
  createDurable() {
    calls.durable += 1;
    throw new Error("durable store must not open");
  },
});
stub("../lib/pusat/idempotencyService.js", {
  createIdempotencyService() {
    return {
      execute() {
        calls.idempotency += 1;
        throw new Error("idempotency must not run");
      },
    };
  },
});
stub("../lib/exceptionBus.js", { list() { return []; }, TYPES: {} });
stub("../lib/productSotValidator.js", {});
stub("../lib/productCollisionDetector.js", {});
stub("../lib/auth.js", {
  requireAuth(req, res) {
    if (!req.session) {
      res.status(401).json({ success: false, errorKey: "admin.auth.required" });
      return null;
    }
    req.adminUser = req.session;
    return req.session;
  },
});

for (const rel of [
  "../lib/security/esatBey.js",
  "../lib/pusat/runtime.js",
  "../plugins/masterIntegrationPlugin.js",
]) {
  delete require.cache[require.resolve(rel)];
}

const esat = require("../lib/security/esatBey.js");
const originalInspect = esat.inspect;
esat.inspect = function inspectSpy(input) {
  calls.inspect += 1;
  return originalInspect.call(esat, input);
};

const { executeReadOnly, dispatch } = require("../lib/pusat/runtime.js");
const originalDispatch = dispatch;
const pusat = require("../lib/pusat/runtime.js");
pusat.dispatch = async function dispatchSpy(...args) {
  calls.httpDispatch += 1;
  return originalDispatch.apply(this, args);
};

const plugin = require("../plugins/masterIntegrationPlugin.js");
const routes = {};
plugin.register({
  get(route, handler) {
    routes[`GET ${route}`] = handler;
  },
  post(route, handler) {
    routes[`POST ${route}`] = handler;
  },
});

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function postDispatch({ session = null, body = {}, headers = {} } = {}) {
  const req = { session, body, headers, adminUser: null };
  const res = mockRes();
  return Promise.resolve(routes["POST /api/admin/pusat/dispatch"](req, res)).then(() => res);
}

describe("ESAT_INSPECT runtime write block", () => {
  it("blocks the action while the runtime flag is off and on", async () => {
    delete process.env.PUSAT_RUNTIME_ENABLED;
    const closed = executeReadOnly("ESAT_INSPECT", { type: "credential_exfiltration" }, {
      actorId: "operator@example.com",
      correlationId: "corr-closed",
    });
    expect(closed.ok).toBe(false);
    expect(closed.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(closed.inspected).toBe(false);
    expect(closed.executed).toBe(false);
    expect(closed.salesOpen).toBe(false);
    expect(closed.egressAllowed).toBe(false);
    expect(closed.productionReady).toBe(false);
    const ping = executeReadOnly("PING", {}, { correlationId: "corr-ping" });
    expect(ping.code).toBe("PUSAT_DISABLED");

    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const open = executeReadOnly("ESAT_INSPECT", { type: "WATCH", details: { path: "/tmp" } }, {
      actorId: "operator@example.com",
      correlationId: "corr-open",
    });
    expect(open.ok).toBe(false);
    expect(open.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(open.inspected).toBe(false);

    const keyed = await dispatch({
      action: "ESAT_INSPECT",
      payload: { type: "SECRET_IN_MESSAGE" },
      actorId: "operator@example.com",
      correlationId: "corr-keyed",
      idempotencyKey: "synthetic-esat-key",
    });
    expect(keyed.replayed).toBe(false);
    expect(keyed.result.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(calls.inspect).toBe(0);
    expect(calls.persist).toBe(0);
    expect(calls.durable).toBe(0);
    expect(calls.idempotency).toBe(0);
    expect(calls.db).toBe(0);
  });

  it("keeps ESAT_STATUS and ESAT_RECENT, and leaves the other record functions in place", () => {
    process.env.PUSAT_RUNTIME_ENABLED = "1";
    const status = executeReadOnly("ESAT_STATUS", {}, {
      actorId: "operator@example.com",
      correlationId: "corr-status",
    });
    expect(status.ok).toBe(true);
    expect(status.data.id).toBe("esat_bey");
    expect(status.data.active).toBe(true);
    const recent = executeReadOnly("ESAT_RECENT", { limit: 2 }, { correlationId: "corr-recent" });
    expect(recent.ok).toBe(true);
    expect(recent.data).toEqual([]);
    expect(calls.inspect).toBe(0);
    expect(calls.persist).toBe(0);
    expect(calls.db).toBe(0);

    const held = esat.inspect({ type: "credential_exfiltration", details: { path: "/tmp" } });
    expect(held.hold).toBe(true);
    expect(held.action).toBe("ISOLATE_AND_HOLD");
    const egress = esat.watchEgress(
      { allowed: false, code: "EXTERNAL_AI_EGRESS_DENIED", host: "example.test" },
      { url: "https://example.test/synthetic" },
    );
    expect(egress.hold).toBe(true);
    const quiet = esat.watchSalesAttempt({ envWantsSales: false, allowed: false });
    expect(quiet.hold).toBe(false);
    expect(calls.inspect).toBe(1);
    expect(calls.persist).toBe(2);
    expect(calls.durable).toBe(0);

    const after = calls.inspect;
    const persisted = calls.persist;
    const stillBlocked = executeReadOnly("ESAT_INSPECT", { type: "PAYMENT_CAPTURE" }, {
      correlationId: "corr-after",
    });
    expect(stillBlocked.code).toBe("LEGACY_ESAT_INSPECT_WRITE_BLOCKED");
    expect(calls.inspect).toBe(after);
    expect(calls.persist).toBe(persisted);
    expect(esat.status().soleDefense).toBe(false);
    expect(typeof esat.watchException).toBe("function");
    expect(typeof esat.activate).toBe("function");
  });

  it("activates in memory without persisting ESAT_ACTIVE", () => {
    const persisted = calls.persist;
    const dbWrites = calls.db;
    const boot = esat.activate();
    expect(boot.activated).toBe(true);
    expect(boot.hooks).toContain("egress");
    expect(boot.hooks).toEqual(esat.HOOKS);
    expect(boot.completeClaim).toBe(false);
    expect(boot.lastEvent.type).toBe("ESAT_ACTIVE");
    expect(boot.lastEvent.severity).toBe("INFO");
    expect(calls.persist).toBe(persisted);
    expect(calls.db).toBe(dbWrites);

    const again = esat.activate();
    expect(again.activated).toBe(true);
    expect(again.eventCount).toBe(boot.eventCount);
    expect(again.lastEvent.id).toBe(boot.lastEvent.id);
    expect(esat.recent(50).filter((event) => event.type === "ESAT_ACTIVE")).toHaveLength(1);
    expect(calls.persist).toBe(persisted);

    const held = esat.inspect({ type: "PAYMENT_CAPTURE", details: { id: "synthetic" } });
    expect(held.hold).toBe(true);
    const egress = esat.watchEgress(
      { allowed: false, code: "PAYMENT_EGRESS_LOCKED", host: "payments.example", classification: "payment" },
      { url: "https://payments.example/synthetic" },
    );
    expect(egress.hold).toBe(true);
    expect(calls.persist).toBe(persisted + 2);
    expect(calls.db).toBeGreaterThan(dbWrites);

    const status = executeReadOnly("ESAT_STATUS", {}, { correlationId: "corr-activated" });
    expect(status.ok).toBe(true);
    expect(status.data.activated).toBe(true);
    expect(status.data.active).toBe(true);
    const recent = executeReadOnly("ESAT_RECENT", { limit: 5 }, { correlationId: "corr-activated-recent" });
    expect(recent.ok).toBe(true);
    expect(recent.data[0].type).toBe("PAYMENT_EGRESS");
    expect(recent.data.some((event) => event.type === "ESAT_ACTIVE")).toBe(true);
  });
});

describe("ESAT_INSPECT HTTP dispatch block", () => {
  it("keeps 401 and permission 403, then blocks an authorized inspect before idempotency", async () => {
    const before = { ...calls };
    const anonymous = await postDispatch({ body: { action: "ESAT_INSPECT" } });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.body.errorKey).toBe("admin.auth.required");

    const denied = await postDispatch({
      session: { email: "agent@example.com", role: "ai_agent" },
      body: { action: "ESAT_INSPECT", idempotencyKey: "must-not-reserve" },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.body.errorKey).toBe("admin.auth.forbidden");
    expect(denied.body.errorCode).toBeUndefined();

    const blocked = await postDispatch({
      session: { email: "reader@example.com", role: "read_only" },
      body: {
        action: "ESAT_INSPECT",
        idempotencyKey: "body-key",
        payload: { type: "credential_exfiltration" },
      },
      headers: { "idempotency-key": "header-key" },
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.body).toEqual({
      success: false,
      errorCode: "LEGACY_ESAT_INSPECT_WRITE_BLOCKED",
      queued: false,
      executed: false,
      salesOpen: false,
      egressAllowed: false,
      productionReady: false,
      purchased: false,
      moneyMoved: false,
      refunded: false,
      shipmentCreated: false,
      orderChanged: false,
    });

    const status = await postDispatch({
      session: { email: "reader@example.com", role: "read_only" },
      body: { action: "ESAT_STATUS" },
    });
    expect(status.statusCode).toBe(200);
    expect(status.body.success).toBe(true);
    expect(status.body.action).toBe("ESAT_STATUS");
    expect(calls.httpDispatch).toBe(before.httpDispatch + 1);
    expect(calls.idempotency).toBe(before.idempotency);
    expect(calls.durable).toBe(before.durable);
    expect(calls.inspect).toBe(before.inspect);
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
