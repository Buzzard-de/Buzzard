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

const calls = { runSync: 0, invalidate: 0, runSyncArgs: null };

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
stub("../lib/auth.js", {
  requireAuth(req, res) {
    if (!req.session) {
      res.status(401).json({ success: false, errorKey: "admin.auth.required" });
      return null;
    }
    return req.session;
  },
});
stub("../lib/storefront/catalogReadService.js", {});
stub("../lib/storefront/categoryCatalog.js", {});
stub("../lib/storefront/catalogCache.js", {
  invalidate() {
    calls.invalidate += 1;
    throw new Error("catalog cache must not be invalidated");
  },
});
stub("../lib/storefront/syncStatus.js", {
  runSync(options) {
    calls.runSync += 1;
    calls.runSyncArgs = options;
    return { dryRun: true, synced: 0, skipped: 0, summary: { total: 0 } };
  },
});
stub("../core/storefrontConstants.js", {
  isStorefrontBridgeEnabled() {
    return true;
  },
});

const pluginPath = require.resolve("../plugins/storefrontBridgePlugin.js");
delete require.cache[pluginPath];
const plugin = require("../plugins/storefrontBridgePlugin.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
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

const catalogSession = {
  userId: "catalog-1",
  role: "catalog_manager",
  email: "catalog@example.com",
  name: "Catalog",
};

function postSync(session, body) {
  const res = mockRes();
  routes["POST /api/admin/storefront/sync"]({
    body,
    headers: {},
    query: {},
    params: {},
    session,
  }, res);
  return res;
}

describe("storefront live sync block", () => {
  it("rejects an authorized live sync before runSync", () => {
    const res = postSync(catalogSession, { dryRun: false });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe("LEGACY_STOREFRONT_SYNC_BLOCKED");
    expect(res.body.executed).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.egressAllowed).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(calls.runSync).toBe(0);
    expect(calls.invalidate).toBe(0);
  });

  it("keeps an authorized dry run on the existing path", () => {
    const res = postSync(catalogSession, { dryRun: true });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dryRun).toBe(true);
    expect(res.body.synced).toBe(0);
    expect(calls.runSync).toBe(1);
    expect(calls.runSyncArgs).toEqual({ dryRun: true });
    expect(calls.invalidate).toBe(0);
  });

  it("keeps unauthenticated and unauthorized responses unchanged", () => {
    const anon = postSync(null, { dryRun: false });
    expect(anon.statusCode).toBe(401);
    expect(anon.body.errorKey).toBe("admin.auth.required");
    expect(anon.body.errorCode).toBeUndefined();

    const staff = postSync({
      userId: "staff-1",
      role: "admin",
      email: "admin@example.com",
      name: "Admin",
    }, { dryRun: true });
    expect(staff.statusCode).toBe(403);
    expect(staff.body.errorKey).toBe("admin.auth.forbidden");
    expect(staff.body.errorCode).toBeUndefined();
    expect(calls.runSync).toBe(1);
    expect(calls.invalidate).toBe(0);
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
