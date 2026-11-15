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

const calls = { fetchCatalog: 0, processRecords: 0, getSupplier: 0 };

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
stub("../lib/salesMode.js", { requireSalesEnabled() {}, isSalesEnabled() { return false; } });
stub("../lib/productStore.js", {});
stub("../lib/productValidator.js", {});
stub("../lib/adapters/supplierAdapter.js", {
  async fetchCatalog() {
    calls.fetchCatalog += 1;
    throw new Error("fetchCatalog must not run");
  },
  listAdapters() { return []; },
});
stub("../lib/adapters/tecdocAdapter.js", {});
stub("../lib/priceStockQueue.js", {});
stub("../lib/productAi.js", {});
stub("../lib/customsAi.js", {});
stub("../lib/categoryIntelligence.js", {});
stub("../lib/p1CatalogPlatform.js", { isEnabled() { return true; } });
stub("../lib/importPipeline.js", {
  processRecords() {
    calls.processRecords += 1;
    throw new Error("processRecords must not run");
  },
});
stub("../lib/supplierStore.js", {
  getSupplier() {
    calls.getSupplier += 1;
    throw new Error("supplier lookup must not run");
  },
});
stub("../lib/seoGooglePrep.js", {});
stub("../lib/i18nCatalog.js", {});

const pluginPath = require.resolve("../plugins/p1CatalogPlatformPlugin.js");
delete require.cache[pluginPath];
const plugin = require("../plugins/p1CatalogPlatformPlugin.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
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

async function postImport(session) {
  const res = mockRes();
  await routes["POST /api/admin/p1/adapters/:adapterId/import"]({
    body: { supplierId: "SUP-DEMO-001", live: true },
    headers: {},
    query: {},
    params: { adapterId: "mock" },
    session,
  }, res);
  return res;
}

describe("p1 catalog import block", () => {
  it("returns 403 for an authorized caller before catalog work", async () => {
    const res = await postImport({
      userId: "catalog-1",
      role: "catalog_manager",
      email: "catalog@example.com",
      name: "Catalog",
    });
    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe("LEGACY_P1_CATALOG_IMPORT_BLOCKED");
    expect(res.body.executed).toBe(false);
    expect(res.body.salesOpen).toBe(false);
    expect(res.body.egressAllowed).toBe(false);
    expect(res.body.productionReady).toBe(false);
    expect(calls).toEqual({ fetchCatalog: 0, processRecords: 0, getSupplier: 0 });
  });

  it("keeps unauthenticated and unauthorized responses unchanged", async () => {
    const anon = await postImport(null);
    expect(anon.statusCode).toBe(401);
    expect(anon.body.errorKey).toBe("admin.auth.required");
    expect(anon.body.errorCode).toBeUndefined();

    const staff = await postImport({
      userId: "staff-1",
      role: "admin",
      email: "admin@example.com",
      name: "Admin",
    });
    expect(staff.statusCode).toBe(403);
    expect(staff.body.errorKey).toBe("admin.auth.forbidden");
    expect(staff.body.errorCode).toBeUndefined();
    expect(calls).toEqual({ fetchCatalog: 0, processRecords: 0, getSupplier: 0 });
  });
});

afterAll(() => {
  expect(fileMark(commerceDb)).toEqual(dbBefore);
  expect(fileMark(ordersPath)).toEqual(ordersBefore);
  expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
  expect(ordersBefore).toBe(null);
});
