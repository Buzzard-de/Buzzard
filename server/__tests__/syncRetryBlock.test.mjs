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

function stub(rel, exports) {
  const resolved = require.resolve(rel);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

const calls = { retryImportLog: 0, processRecords: 0, audit: 0, syncWrite: 0 };

stub("../lib/db.js", {
  db: {
    prepare() {
      throw new Error("commerce database must stay closed");
    },
  },
});
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
stub("../lib/audit.js", {
  logAudit() {
    calls.audit += 1;
    throw new Error("audit must not be written");
  },
});
stub("../lib/productStore.js", {});
stub("../lib/supplierStore.js", {});
stub("../lib/importPipeline.js", {
  retryImportLog() {
    calls.retryImportLog += 1;
    calls.processRecords += 1;
    throw new Error("retryImportLog must not run");
  },
  processRecords() {
    calls.processRecords += 1;
    throw new Error("processRecords must not run");
  },
});
stub("../lib/syncLog.js", {
  updateImportLog() {
    calls.syncWrite += 1;
    throw new Error("sync log must not be written");
  },
  listImportLogs() {
    throw new Error("sync log must not be read");
  },
  listSyncJobs() {
    return [];
  },
});
stub("../lib/pricing.js", {});
stub("../lib/productValidator.js", {});
stub("../lib/security.js", {});
stub("../lib/securityLog.js", { logSecurityEvent() {} });
stub("../lib/productSot.js", {});

const pluginPath = require.resolve("../plugins/adminCatalogPlugin.js");
delete require.cache[pluginPath];
const plugin = require("../plugins/adminCatalogPlugin.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
  put(route, handler) { routes[`PUT ${route}`] = handler; },
  patch(route, handler) { routes[`PATCH ${route}`] = handler; },
});

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

function postRetry(session) {
  const res = mockRes();
  routes["POST /api/admin/sync/retry"]({
    body: { logId: "log-synthetic" },
    headers: {},
    query: {},
    params: {},
    session,
  }, res);
  return res;
}

describe("legacy sync retry block", () => {
  it("returns 403 for an authorized caller before retry", () => {
    const res = postRetry({
      userId: "catalog-1",
      role: "catalog_manager",
      email: "catalog@example.com",
      name: "Catalog",
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe("LEGACY_SYNC_RETRY_BLOCKED");
    expect(res.body.executed).toBe(false);
    expect(res.body.queued).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(calls).toEqual({ retryImportLog: 0, processRecords: 0, audit: 0, syncWrite: 0 });
  });

  it("keeps unauthenticated and unauthorized responses unchanged", () => {
    const anon = postRetry(null);
    expect(anon.statusCode).toBe(401);
    expect(anon.body.errorKey).toBe("admin.auth.required");
    expect(anon.body.errorCode).toBeUndefined();

    const staff = postRetry({
      userId: "staff-1",
      role: "admin",
      email: "admin@example.com",
      name: "Admin",
    });
    expect(staff.statusCode).toBe(403);
    expect(staff.body.errorKey).toBe("admin.auth.forbidden");
    expect(staff.body.errorCode).toBeUndefined();
    expect(calls).toEqual({ retryImportLog: 0, processRecords: 0, audit: 0, syncWrite: 0 });
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
