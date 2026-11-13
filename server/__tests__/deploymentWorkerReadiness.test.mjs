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
const calls = { summary: 0, startWorker: 0, tickScheduler: 0 };

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

let session = { userId: "synthetic-admin", role: "admin" };
let allowPermission = true;
let summaryFixture = null;

stub("../lib/auth.js", {
  requireAuth(_req, res) {
    if (!session) {
      res.status(401).json({ success: false });
      return null;
    }
    return session;
  },
});
stub("../lib/rbac.js", {
  requirePermission(_req, res) {
    if (allowPermission) return true;
    res.status(403).json({ success: false });
    return false;
  },
});
stub("../lib/productionHealth.js", {
  async getProductionSummary() {
    calls.summary += 1;
    return summaryFixture;
  },
  getWorkerHealth() {
    throw new Error("deployment readiness must not read a live worker");
  },
  startWorker() {
    calls.startWorker += 1;
    throw new Error("worker must not start");
  },
});
stub("../lib/deploymentIdentity.js", {
  getDeploymentDrift() {
    return { status: "SYNTHETIC", runningCommit: null, expectedCommit: null };
  },
});
stub("../lib/jobWorker.js", {
  startWorker() {
    calls.startWorker += 1;
    throw new Error("worker must not start");
  },
});
stub("../lib/jobScheduler.js", {
  tickScheduler() {
    calls.tickScheduler += 1;
    throw new Error("scheduler must not tick");
  },
});

const pluginPath = require.resolve("../plugins/productionHealthPlugin.js");
delete require.cache[pluginPath];
const plugin = require("../plugins/productionHealthPlugin.js");

const routes = {};
plugin.register({
  get(route, handler) {
    routes[route] = handler;
  },
});

function passingSummary(worker) {
  return {
    overall: "OK",
    database: {
      integrity: { status: "OK", integrityCheck: "ok" },
      persistence: { persistent: true, mode: "file" },
    },
    environment: { ok: true, errors: [] },
    deployment: { status: "SYNCED" },
    redis: { ok: true, status: "OK" },
    worker,
    catalog: { status: "OK", productCount: 3 },
    commerce: { salesEnabled: false },
    goLiveLock: true,
  };
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function deploy(worker, summary = passingSummary(worker)) {
  summaryFixture = summary;
  const res = mockRes();
  await routes["/api/admin/control-center/deployment"]({ query: {} }, res);
  return res.body;
}

function checkByName(readiness, name) {
  return readiness.checks.find((check) => check.name === name);
}

function otherChecks(readiness) {
  return readiness.checks
    .filter((check) => check.name !== "worker")
    .map((check) => ({ name: check.name, status: check.status, detail: check.detail }));
}

describe("deployment worker readiness", () => {
  it("does not PASS when enabled is true and runtime is unverified", async () => {
    const body = await deploy({
      enabled: true,
      status: "STOPPED",
      runtimeVerified: false,
    });
    const worker = checkByName(body.readiness, "worker");
    expect(worker.status).not.toBe("PASS");
    expect(worker.status).toBe("UNKNOWN");
    expect(worker.detail).toContain("runtimeVerified=false");
    expect(body.success).toBe(true);
    expect(body.readiness.overall).toBe("PASS");
  });

  it("does not PASS an unverified RUNNING status", async () => {
    const body = await deploy({
      enabled: true,
      status: "RUNNING",
      runtimeVerified: false,
      storedStatus: "RUNNING",
    });
    const worker = checkByName(body.readiness, "worker");
    expect(worker.status).not.toBe("PASS");
    expect(worker.status).toBe("UNKNOWN");
    expect(worker.detail).toContain("status=RUNNING");
    expect(worker.detail).toContain("runtimeVerified=false");
    expect(body.readiness.overall).toBe("PASS");
  });

  it("reports UNKNOWN and BLOCKED without treating them as running", async () => {
    const unknown = await deploy({
      enabled: true,
      status: "UNKNOWN",
      runtimeVerified: false,
    });
    const blocked = await deploy({
      enabled: false,
      status: "BLOCKED",
      runtimeVerified: false,
    });
    expect(checkByName(unknown.readiness, "worker").status).toBe("UNKNOWN");
    expect(checkByName(blocked.readiness, "worker").status).toBe("BLOCKED");
    expect(unknown.readiness.overall).toBe("PASS");
    expect(blocked.readiness.overall).toBe("BLOCKED");
    expect(otherChecks(unknown.readiness)).toEqual(otherChecks(blocked.readiness));
  });

  it("keeps PASS only for verified RUNNING and leaves the other checks unchanged", async () => {
    const verified = await deploy({
      enabled: true,
      status: "RUNNING",
      runtimeVerified: true,
    });
    const verifiedWithoutEnabled = await deploy({
      enabled: false,
      status: "RUNNING",
      runtimeVerified: true,
    });
    const closed = await deploy({
      enabled: false,
      status: "UNKNOWN",
      runtimeVerified: false,
    });
    expect(checkByName(verified.readiness, "worker").status).toBe("PASS");
    expect(checkByName(verifiedWithoutEnabled.readiness, "worker").status).toBe("PASS");
    expect(otherChecks(verified.readiness)).toEqual(otherChecks(closed.readiness));
    expect(otherChecks(verifiedWithoutEnabled.readiness)).toEqual(otherChecks(closed.readiness));
    expect(checkByName(verified.readiness, "commerce_safety").status).toBe("PASS");
    expect(checkByName(verified.readiness, "commerce_safety").detail).toBe("sales=false");
    expect(verified.readiness.overall).toBe("PASS");
    expect(closed.readiness.overall).toBe("PASS");
  });

  it("does not let a closed worker rewrite an unrelated failed check", async () => {
    const summary = passingSummary({ enabled: false, status: "UNKNOWN", runtimeVerified: false });
    summary.database.integrity.status = "FAILED";
    const body = await deploy(summary.worker, summary);
    expect(checkByName(body.readiness, "database").status).toBe("BLOCKED");
    expect(checkByName(body.readiness, "worker").status).toBe("UNKNOWN");
    expect(checkByName(body.readiness, "catalog").status).toBe("PASS");
    expect(body.readiness.overall).toBe("BLOCKED");
  });

  it("keeps the admin gate and does not start background work", async () => {
    const before = calls.summary;
    session = null;
    const denied = mockRes();
    await routes["/api/admin/control-center/deployment"]({ query: {} }, denied);
    expect(denied.statusCode).toBe(401);
    expect(calls.summary).toBe(before);

    session = { userId: "synthetic-admin", role: "admin" };
    allowPermission = false;
    const forbidden = mockRes();
    await routes["/api/admin/control-center/deployment"]({ query: {} }, forbidden);
    expect(forbidden.statusCode).toBe(403);
    expect(calls.summary).toBe(before);
    allowPermission = true;
    expect(calls.startWorker).toBe(0);
    expect(calls.tickScheduler).toBe(0);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
});
