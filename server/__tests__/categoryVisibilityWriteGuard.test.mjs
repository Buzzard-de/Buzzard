import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const ordersPath = path.join(repoRoot, "server/data/orders.json");
const catalogPath = path.join(repoRoot, "data/buzzard_categories.json");
const visibilityPath = path.join(repoRoot, "data/buzzard_category_visibility.json");
const identityPath = path.join(repoRoot, "server/lib/buzzardNative/core/identityRegistry.js");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-category-visibility-"));
const previousAuditDir = process.env.BUZZARD_AUDIT_DIR;
const previousVisibilityDir = process.env.BUZZARD_VISIBILITY_DIR;
process.env.BUZZARD_AUDIT_DIR = tempDir;
process.env.BUZZARD_VISIBILITY_DIR = tempDir;

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const ordersBefore = fileMark(ordersPath);
const catalogBefore = fs.readFileSync(catalogPath);
const visibilityBefore = fs.readFileSync(visibilityPath);
const identityBefore = fs.readFileSync(identityPath);

const synthetic = new Database(path.join(tempDir, "visibility.sqlite"));
synthetic.exec(`
  CREATE TABLE core_category_visibility(
    category_id TEXT PRIMARY KEY,
    status TEXT,
    readiness_json TEXT,
    updated_by TEXT,
    updated_at TEXT
  );
  CREATE TABLE core_system_events(
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    actor_type TEXT,
    actor_id TEXT,
    resource_type TEXT,
    resource_id TEXT,
    summary TEXT,
    metadata_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const writes = [];
const originalPrepare = synthetic.prepare.bind(synthetic);
synthetic.prepare = (sql) => {
  if (/^\s*(insert|update|delete)/i.test(sql)) writes.push(String(sql));
  return originalPrepare(sql);
};

function stub(resolved, exports) {
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

stub(require.resolve("../lib/db.js"), {
  db: synthetic,
  getDatabaseHealth() {
    return { ok: false, mocked: true };
  },
});
stub(require.resolve("../lib/auth.js"), {
  requireAuth(req, res) {
    res.status(401).json({ success: false, errorKey: "admin.auth.required" });
    return null;
  },
});

const plugin = require("../plugins/controlCenterPlugin.js");
const categoryVisibility = require("../lib/categoryVisibility.js");
const routes = {};
plugin.register({
  get(route, handler) { routes[`GET ${route}`] = handler; },
  post(route, handler) { routes[`POST ${route}`] = handler; },
  put(route, handler) { routes[`PUT ${route}`] = handler; },
  patch(route, handler) { routes[`PATCH ${route}`] = handler; },
  delete(route, handler) { routes[`DELETE ${route}`] = handler; },
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

function patchVisibility(categoryId, body, role = "admin") {
  const res = mockRes();
  routes["PATCH /api/admin/categories/:categoryId/visibility"]({
    body,
    headers: {},
    query: {},
    params: { categoryId },
    url: `/api/admin/categories/${categoryId}/visibility`,
    adminUser: { userId: "synthetic-admin", role, email: "admin@example.com", name: "Synthetic" },
  }, res);
  return res;
}

function tempVisibilityFile() {
  return path.join(tempDir, "buzzard_category_visibility.json");
}

afterAll(() => {
  synthetic.close();
  if (previousAuditDir === undefined) delete process.env.BUZZARD_AUDIT_DIR;
  else process.env.BUZZARD_AUDIT_DIR = previousAuditDir;
  if (previousVisibilityDir === undefined) delete process.env.BUZZARD_VISIBILITY_DIR;
  else process.env.BUZZARD_VISIBILITY_DIR = previousVisibilityDir;
});

describe("category visibility write guard", () => {
  it("rejects invalid visibility before a write", () => {
    for (const status of ["active", "SALE_OPEN", "PAID", "", null, "READY"]) {
      const res = patchVisibility("cat-01", { status, paymentStatus: "paid", salesEnabled: true });
      expect(res.statusCode).toBe(400);
      expect(res.body.errorCode).toBe("CATEGORY_VISIBILITY_INVALID");
      expect(res.body.visibility).toBeUndefined();
    }
    expect(writes).toEqual([]);
    expect(fs.existsSync(tempVisibilityFile())).toBe(false);
    expect(fs.readdirSync(tempDir).filter((name) => name.endsWith(".json"))).toEqual([]);
  });

  it("rejects an unknown category id without creating it", () => {
    const res = patchVisibility("cat-does-not-exist", { status: "ACTIVE", paymentStatus: "captured" });
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, errorCode: "CATEGORY_NOT_FOUND", errorKey: "category.notFound" });
    expect(writes).toEqual([]);
    expect(fs.existsSync(tempVisibilityFile())).toBe(false);
    expect(synthetic.prepare("SELECT COUNT(*) AS n FROM core_category_visibility").get().n).toBe(0);
  });

  it("stores the four contract statuses without accepting payment or sale flags", () => {
    const ready = {
      products: "READY",
      pricing: "READY",
      stock: "READY",
      supplier: "READY",
      shipping: "READY",
      payment: "READY",
      logistics: "READY",
      frontend: "READY",
      legal: "READY",
      content: "READY",
      overall: "READY",
    };
    const cases = [
      ["ACTIVE", true],
      ["COMING_SOON", true],
      ["HIDDEN", false],
      ["DRAFT", false],
    ];
    for (const [status, customerVisible] of cases) {
      const res = patchVisibility("cat-01", {
        status,
        paymentStatus: "paid",
        salesEnabled: true,
        productionReady: true,
        readiness: ready,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visibility.status).toBe(status);
      expect(res.body.visibility.readiness.payment).toBe("BLOCKED");
      expect(res.body.visibility.readiness.overall).not.toBe("READY");
      expect(res.body.visibility.paymentStatus).toBeUndefined();
      expect(categoryVisibility.isVisibleToCustomer(res.body.visibility.status)).toBe(customerVisible);
      expect(categoryVisibility.canActivateForSale(res.body.visibility.readiness, res.body.visibility.status)).toBe(false);
    }
    const stored = JSON.parse(fs.readFileSync(tempVisibilityFile(), "utf8"));
    expect(Object.keys(stored.categories)).toEqual(["cat-01"]);
    expect(stored.categories["cat-01"].status).toBe("DRAFT");
    expect(stored.categories["cat-01"].readiness.payment).toBe("BLOCKED");
    const row = synthetic.prepare("SELECT category_id, status, readiness_json FROM core_category_visibility").get();
    expect(row.category_id).toBe("cat-01");
    expect(row.status).toBe("DRAFT");
    expect(JSON.parse(row.readiness_json).payment).toBe("BLOCKED");
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });

  it("leaves catalog ids, the live visibility file, and the commerce database unchanged", () => {
    expect(fs.readFileSync(catalogPath).equals(catalogBefore)).toBe(true);
    expect(fs.readFileSync(visibilityPath).equals(visibilityBefore)).toBe(true);
    expect(fs.readFileSync(identityPath).equals(identityBefore)).toBe(true);
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(ordersBefore).toBe(null);
    expect(dbBefore).toMatchObject({ ino: 615782, size: 1736704 });
    expect(process.env.BUZZARD_SALES_ENABLED).not.toBe("1");
  });
});
