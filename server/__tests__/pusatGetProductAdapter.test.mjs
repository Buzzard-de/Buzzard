import { createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverRequire = createRequire(path.join(repoRoot, "server/package.json"));
const commerceDb = path.join(repoRoot, "server/data/buzzard.db");
const workspaceDb = "/workspace/server/data/buzzard.db";
const pusatMemory = path.join(os.tmpdir(), "buzzard-pusat-orch.sqlite");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const workspaceBefore = fileMark(workspaceDb);
const pusatBefore = fileMark(pusatMemory);
const previousSales = process.env.BUZZARD_SALES_ENABLED;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-get-product-adapter-"));
const synthetic = path.join(dir, "synthetic-catalog.sqlite");
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");
const opens = [];

function CountingDatabase(filename, options) {
  const instance = new RealDatabase(filename, options);
  opens.push({
    filename,
    readonly: Boolean(options && options.readonly),
    fileMustExist: Boolean(options && options.fileMustExist),
  });
  return instance;
}

const realSqlite = serverRequire.cache[sqliteId];
serverRequire.cache[sqliteId] = {
  id: sqliteId,
  filename: sqliteId,
  loaded: true,
  exports: CountingDatabase,
};

delete process.env.BUZZARD_SALES_ENABLED;
const cacheBeforeAdapter = new Set(Object.keys(require.cache));
const { adaptGetProduct } = require("../lib/catalog/pusatGetProductAdapter.js");
const adapterLoaded = Object.keys(require.cache).filter((id) => !cacheBeforeAdapter.has(id));
const commerce = require("../lib/db.js");
const { createSyntheticCatalog } = require("../lib/catalog/syntheticCatalogFixture.js");
const { openReadOnlyCatalog } = require("../lib/catalog/readOnlyCatalog.js");

function codeOf(fn) {
  try {
    fn();
    return null;
  } catch (error) {
    return error && error.code ? error.code : error && error.message;
  }
}

function digest(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function loadedPaths() {
  return Object.keys(require.cache).map((id) => id.replaceAll("\\", "/"));
}

createSyntheticCatalog(synthetic);
const catalog = openReadOnlyCatalog({ dbPath: synthetic });
const beforeHash = digest(synthetic);

function read(payload, extra = {}) {
  return adaptGetProduct({
    catalog,
    payload,
    sotActive: false,
    correlationId: "corr-fixture",
    ...extra,
  });
}

afterAll(() => {
  try { catalog.close(); } catch { /* the fixture connection is already closed */ }
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("isolated Pusat GET_PRODUCT adapter", () => {
  it("loads without Pusat, Sinan, Esat, product services, or a database connection", () => {
    expect(adapterLoaded.some((id) => id.replaceAll("\\", "/").includes("/lib/pusat/"))).toBe(false);
    expect(adapterLoaded.some((id) => id.endsWith(`${path.sep}lib${path.sep}db.js`))).toBe(false);
    expect(adapterLoaded.some((id) => id.endsWith("productService.js") || id.endsWith("productSot.js"))).toBe(false);
    expect(opens).toEqual([
      { filename: path.resolve(synthetic), readonly: false, fileMustExist: false },
      { filename: path.resolve(synthetic), readonly: true, fileMustExist: true },
    ]);
  });

  it("reads a product by id and by sku", () => {
    expect(read({ id: "fiction-lamp-1" }).data).toMatchObject({
      id: "fiction-lamp-1",
      sku: "FICTION-LAMP-001",
      title: "Paper Lantern Sample",
    });
    expect(read({ sku: "FICTION-MUG-001" }).data).toMatchObject({
      id: "fiction-mug-1",
      sku: "FICTION-MUG-001",
      title: "Ceramic Sample Mug",
    });
  });

  it("prefers id when id and sku identify different products", () => {
    const selected = read({ id: "fiction-lamp-1", sku: "FICTION-MUG-001" });
    expect(selected.data.id).toBe("fiction-lamp-1");
    expect(selected.data.sku).toBe("FICTION-LAMP-001");
    expect(read({ id: "missing-id", sku: "FICTION-MUG-001" }).code).toBe("NOT_FOUND");
    expect(read({ id: "", sku: "FICTION-MUG-001" }).data.sku).toBe("FICTION-MUG-001");
  });

  it("returns INVALID_PAYLOAD without querying the catalog", () => {
    const calls = [];
    const sentinel = {
      capabilities: { write: false },
      queryOnly: () => true,
      readProductForPusat(key) {
        calls.push(key);
        return null;
      },
    };
    for (const payload of [undefined, null, {}, { id: "", sku: "" }, { id: null, sku: null }]) {
      expect(adaptGetProduct({
        catalog: sentinel,
        payload,
        sotActive: false,
        correlationId: "corr-invalid",
      })).toEqual({
        ok: false,
        code: "INVALID_PAYLOAD",
        action: "GET_PRODUCT",
        correlationId: "corr-invalid",
        mode: "DRY_RUN",
        live: false,
        mock: false,
        dryRun: true,
      });
    }
    expect(calls).toEqual([]);
  });

  it("returns NOT_FOUND and UNMAPPED for an unknown key", () => {
    expect(read({ sku: "missing-sku" }, { sotActive: true, correlationId: "corr-missing" })).toEqual({
      ok: false,
      code: "NOT_FOUND",
      action: "GET_PRODUCT",
      correlationId: "corr-missing",
      mappingStatus: "UNMAPPED",
      sotActive: true,
      mode: "DRY_RUN",
      live: false,
      mock: false,
      dryRun: true,
    });
  });

  it("returns the seven-field dry-run envelope with null stock and price", () => {
    const result = read(
      { sku: "FICTION-LAMP-001" },
      { actorId: "fixture-actor", sotActive: false, correlationId: "corr-success" },
    );
    expect(result).toEqual({
      ok: true,
      action: "GET_PRODUCT",
      data: {
        id: "fiction-lamp-1",
        sku: "FICTION-LAMP-001",
        title: "Paper Lantern Sample",
        status: "FIXTURE",
        visibility: "NON_COMMERCIAL",
        stock: null,
        price: null,
      },
      source: "UNKNOWN",
      mappingStatus: "CANDIDATE",
      sotActive: false,
      actorId: "fixture-actor",
      correlationId: "corr-success",
      mode: "DRY_RUN",
      live: false,
      mock: false,
      dryRun: true,
    });
    expect(Object.keys(result.data)).toEqual(["id", "sku", "title", "status", "visibility", "stock", "price"]);
    expect(JSON.stringify(result)).not.toContain("commercialValuesStored");
    expect(result.data.stock).toBeNull();
    expect(result.data.price).toBeNull();
  });

  it("uses UNKNOWN unless the caller supplies a source", () => {
    expect(read({ id: "fiction-mug-1" }).source).toBe("UNKNOWN");
    expect(read({ id: "fiction-mug-1" }, { source: "   " }).source).toBe("UNKNOWN");
    expect(read({ id: "fiction-mug-1" }, { source: "CATALOG_FIXTURE" }).source).toBe("CATALOG_FIXTURE");
  });

  it("rejects a writable connection and write SQL without changing the fixture", () => {
    const calls = [];
    const writable = {
      capabilities: { write: true },
      queryOnly: () => false,
      readProductForPusat(key) {
        calls.push(key);
        return { id: key };
      },
    };
    expect(codeOf(() => adaptGetProduct({
      catalog: writable,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
    }))).toBe("CATALOG_READ_ONLY");
    expect(calls).toEqual([]);
    for (const sql of [
      "INSERT INTO catalog_products (id, sku, title, status, visibility) VALUES ('x', 'x', 'x', 'x', 'x')",
      "UPDATE catalog_products SET title = 'changed'",
      "DELETE FROM catalog_products",
      "ALTER TABLE catalog_products ADD COLUMN price REAL",
      "DROP TABLE catalog_products",
      "CREATE TABLE commerce_orders (id TEXT)",
    ]) {
      expect(codeOf(() => catalog.readSql(sql))).toBe("CATALOG_READ_ONLY");
    }
    expect(digest(synthetic)).toBe(beforeHash);
  });

  it("requires a caller boolean for sotActive and does not query first", () => {
    const calls = [];
    const sentinel = {
      capabilities: { write: false },
      queryOnly: () => true,
      readProductForPusat(key) {
        calls.push(key);
        return null;
      },
    };
    expect(codeOf(() => adaptGetProduct({
      catalog: sentinel,
      payload: { sku: "FICTION-LAMP-001" },
    }))).toBe("SOT_ACTIVE_REQUIRED");
    expect(calls).toEqual([]);
  });

  it("leaves the commerce proxy uninitialized and does not load Pusat, Sinan, or Esat", () => {
    expect(commerce.databaseMode).toBe("UNINITIALIZED");
    expect(codeOf(() => commerce.db.prepare("SELECT id FROM catalog_products"))).toBe("DATABASE_NOT_INITIALIZED");
    const loaded = loadedPaths();
    expect(loaded.some((id) => id.endsWith("/lib/pusat/runtime.js"))).toBe(false);
    expect(loaded.some((id) => id.includes("/sinan"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/security/esatBey.js"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/productService.js"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/productSot.js"))).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).toBeUndefined();
  });

  it("never opens a protected database or the Pusat memory file", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
    expect(opens.every((opened) => opened.filename === path.resolve(synthetic))).toBe(true);
    expect(adaptGetProduct({
      catalog,
      payload: { id: commerceDb },
      sotActive: false,
      dbPath: workspaceDb,
    }).code).toBe("NOT_FOUND");
    expect(opens).toHaveLength(2);
  });
});
