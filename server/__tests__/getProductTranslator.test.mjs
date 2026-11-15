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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-get-product-translator-"));
const synthetic = path.join(dir, "synthetic-catalog.sqlite");
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");
const opens = [];

function CountingDatabase(filename, options) {
  const instance = new RealDatabase(filename, options);
  opens.push(Buffer.isBuffer(filename) ? ":memory:" : path.resolve(String(filename)));
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
const { translateGetProduct } = require("../lib/catalog/getProductTranslator.js");
const { createSyntheticCatalog } = require("../lib/catalog/syntheticCatalogFixture.js");
const { openReadOnlyCatalog } = require("../lib/catalog/readOnlyCatalog.js");

createSyntheticCatalog(synthetic);
const catalog = openReadOnlyCatalog({ dbPath: synthetic });

function read(payload, extra = {}) {
  return translateGetProduct({
    catalog,
    payload,
    sotActive: false,
    correlationId: "corr-translator",
    ...extra,
  });
}

function loadedPaths() {
  return Object.keys(require.cache).map((id) => id.replaceAll("\\", "/"));
}

afterAll(() => {
  try { catalog.close(); } catch { /* already closed */ }
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("GET_PRODUCT translator", () => {
  it("reads a product by id and by sku, with id taking priority", () => {
    const byId = read({ id: "fiction-lamp-1" });
    expect(byId.ok).toBe(true);
    expect(byId.data).toEqual({
      id: "fiction-lamp-1",
      sku: "FICTION-LAMP-001",
      title: "Paper Lantern Sample",
      status: "FIXTURE",
      visibility: "NON_COMMERCIAL",
      stock: null,
      price: null,
    });
    expect(read({ sku: "FICTION-MUG-001" }).data).toMatchObject({
      id: "fiction-mug-1",
      sku: "FICTION-MUG-001",
      title: "Ceramic Sample Mug",
    });
    expect(read({ id: "fiction-lamp-1", sku: "FICTION-MUG-001" }).data.id).toBe("fiction-lamp-1");
  });

  it("returns INVALID_PAYLOAD and NOT_FOUND without product data", () => {
    expect(read({})).toMatchObject({
      ok: false,
      code: "INVALID_PAYLOAD",
      action: "GET_PRODUCT",
      mode: "DRY_RUN",
      live: false,
      dryRun: true,
    });
    expect(read({}).data).toBeUndefined();
    expect(read({ sku: "missing-sku" }, { sotActive: true })).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
      mappingStatus: "UNMAPPED",
      sotActive: false,
      sotClaim: "UNVERIFIED",
      mode: "DRY_RUN",
      live: false,
      dryRun: true,
    });
    expect(read({ sku: "missing-sku" }).data).toBeUndefined();
  });

  it("keeps UNKNOWN as the default, accepts the synthetic label, and refuses source D", () => {
    expect(read({ id: "fiction-lamp-1" }).source).toBe("UNKNOWN");
    expect(read({ id: "fiction-lamp-1" }, { source: "   " }).source).toBe("UNKNOWN");
    expect(read({ id: "fiction-lamp-1" }, { source: "SYNTHETIC_CATALOG" }).source).toBe("SYNTHETIC_CATALOG");
    for (const source of ["D", "d", " D ", "LIVE"]) {
      const refused = read({ id: "fiction-lamp-1" }, { source });
      expect(refused.code).toBe("SOURCE_REFUSED");
      expect(refused.data).toBeUndefined();
      expect(JSON.stringify(refused)).not.toContain('"source":"D"');
    }
  });

  it("requires an external boolean for sotActive and keeps the dry-run label", () => {
    const calls = [];
    const impostor = {
      capabilities: { write: false },
      queryOnly() {
        calls.push("query");
        return true;
      },
      readProductForPusat() {
        calls.push("read");
        return { id: "fiction-lamp-1", price: 10, stock: 2 };
      },
    };
    expect(translateGetProduct({
      catalog: impostor,
      payload: { id: "fiction-lamp-1" },
    })).toMatchObject({
      ok: false,
      code: "SOT_ACTIVE_REQUIRED",
      mode: "DRY_RUN",
      live: false,
      dryRun: true,
    });
    expect(calls).toEqual([]);
    const success = read({ id: "fiction-mug-1" }, { sotActive: true, actorId: "fixture-reader" });
    expect(success.sotActive).toBe(false);
    expect(success.sotClaim).toBe("UNVERIFIED");
    expect(JSON.stringify(success)).not.toContain('"sotActive":true');
    expect(success.mode).toBe("DRY_RUN");
    expect(success.live).toBe(false);
    expect(success.mock).toBe(false);
    expect(success.dryRun).toBe(true);
    expect(success.data.stock).toBeNull();
    expect(success.data.price).toBeNull();
    expect(Object.keys(success.data)).toEqual(["id", "sku", "title", "status", "visibility", "stock", "price"]);
  });

  it("resolves an id and sku collision by searching id first", () => {
    const file = path.join(dir, "collision-catalog.sqlite");
    const writer = new RealDatabase(file);
    writer.exec(`
      CREATE TABLE catalog_products (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        visibility TEXT NOT NULL
      );
      INSERT INTO catalog_products VALUES ('shared-key', 'OTHER-SKU', 'Id Row', 'FIXTURE', 'NON_COMMERCIAL');
      INSERT INTO catalog_products VALUES ('other-id', 'shared-key', 'Sku Row', 'FIXTURE', 'NON_COMMERCIAL');
    `);
    writer.close();
    const collision = openReadOnlyCatalog({ dbPath: file });
    const byId = translateGetProduct({
      catalog: collision,
      payload: { id: "shared-key" },
      sotActive: false,
    });
    const bySku = translateGetProduct({
      catalog: collision,
      payload: { sku: "shared-key" },
      sotActive: false,
    });
    const fallback = translateGetProduct({
      catalog: collision,
      payload: { id: "missing-id", sku: "shared-key" },
      sotActive: false,
    });
    expect(byId.data).toMatchObject({ id: "shared-key", sku: "OTHER-SKU", title: "Id Row", price: null, stock: null });
    expect(bySku.data).toMatchObject({ id: "other-id", sku: "shared-key", title: "Sku Row", price: null, stock: null });
    expect(fallback.data.title).toBe("Sku Row");
    collision.close();
    const ambiguous = path.join(dir, "ambiguous-sku.sqlite");
    const duplicate = new RealDatabase(ambiguous);
    duplicate.exec(`
      CREATE TABLE catalog_products (
        id TEXT PRIMARY KEY, sku TEXT NOT NULL, title TEXT NOT NULL,
        status TEXT NOT NULL, visibility TEXT NOT NULL, price REAL, stock INTEGER
      );
      INSERT INTO catalog_products VALUES ('a', 'DUP-SKU', 'A', 'FIXTURE', 'NON_COMMERCIAL', 10, 1);
      INSERT INTO catalog_products VALUES ('b', 'DUP-SKU', 'B', 'FIXTURE', 'NON_COMMERCIAL', 11, 2);
    `);
    duplicate.close();
    const duplicated = openReadOnlyCatalog({ dbPath: ambiguous });
    const outcome = translateGetProduct({
      catalog: duplicated,
      payload: { sku: "DUP-SKU" },
      sotActive: false,
    });
    expect(outcome).toMatchObject({
      ok: false,
      code: "CATALOG_KEY_AMBIGUOUS",
      mode: "DRY_RUN",
      live: false,
      dryRun: true,
    });
    expect(outcome.data).toBeUndefined();
    expect(JSON.stringify(outcome)).not.toMatch(/"price"|DUP-SKU|SELECT/);
    duplicated.close();
  });

  it("rejects inherited, array, and object keys without reading a product", () => {
    const calls = [];
    const impostor = {
      capabilities: { write: false },
      queryOnly() {
        calls.push("query");
        return true;
      },
      readSql() {
        calls.push("sql");
        return [{ id: "fiction-lamp-1", sku: "FICTION-LAMP-001", title: "x", status: "FIXTURE", visibility: "NON_COMMERCIAL" }];
      },
      readProductForPusat() {
        calls.push("read");
        return { id: "fiction-lamp-1", price: 10, stock: 2 };
      },
    };
    const inherited = Object.create({ id: "fiction-lamp-1" });
    for (const payload of [inherited, { id: ["fiction-lamp-1"] }, { id: { toString() { return "fiction-lamp-1"; } } }, { sku: { value: "FICTION-LAMP-001" } }]) {
      const outcome = translateGetProduct({
        catalog: impostor,
        payload,
        sotActive: false,
        actorId: "fixture-reader",
      });
      expect(outcome.code).toBe("INVALID_PAYLOAD");
      expect(outcome.data).toBeUndefined();
    }
    expect(translateGetProduct({
      catalog,
      payload: inherited,
      sotActive: false,
    }).code).toBe("INVALID_PAYLOAD");
    expect(calls).toEqual([]);
    expect(Object.prototype.polluted).toBeUndefined();
    const actor = translateGetProduct({
      catalog,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
      actorId: { path: synthetic },
    });
    expect(actor.code).toBe("INVALID_PAYLOAD");
    expect(JSON.stringify(actor)).not.toContain(synthetic);
  });

  it("hides unknown failures and does not return sql or file paths", () => {
    const file = path.join(dir, "broken-catalog.sqlite");
    const writer = new RealDatabase(file);
    writer.exec("CREATE TABLE unrelated (id TEXT)");
    writer.close();
    const broken = openReadOnlyCatalog({ dbPath: file });
    const outcome = translateGetProduct({
      catalog: broken,
      payload: { id: "fiction-lamp-1' OR 1=1 --" },
      sotActive: false,
      correlationId: "'; DROP TABLE catalog_products; --",
    });
    expect(outcome.code).toBe("REQUEST_REFUSED");
    expect([
      "INVALID_PAYLOAD",
      "NOT_FOUND",
      "SOURCE_REFUSED",
      "SOT_ACTIVE_REQUIRED",
      "CATALOG_CONNECTION_REQUIRED",
      "CATALOG_READ_ONLY",
      "CATALOG_INTEGRITY_FAILED",
      "REQUEST_REFUSED",
    ]).toContain(outcome.code);
    expect(outcome.data).toBeUndefined();
    expect(outcome.stack).toBeUndefined();
    const rendered = JSON.stringify(outcome);
    expect(rendered).not.toContain(file);
    expect(rendered).not.toContain("SELECT");
    expect(rendered).not.toContain("no such table");
    expect(rendered).not.toContain("DROP TABLE");
    expect(rendered).not.toContain("readOnlyCatalog");
    broken.close();
  });

  it("returns no product data when catalog integrity fails", () => {
    const file = path.join(dir, "tampered-catalog.sqlite");
    createSyntheticCatalog(file);
    const tampered = openReadOnlyCatalog({ dbPath: file });
    const bytes = fs.readFileSync(file);
    bytes[20] ^= 0xff;
    const writer = fs.openSync(file, "r+");
    fs.writeSync(writer, bytes, 0, bytes.length, 0);
    fs.closeSync(writer);
    const outcome = translateGetProduct({
      catalog: tampered,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
      correlationId: "corr-integrity",
    });
    expect(outcome).toEqual({
      ok: false,
      code: "CATALOG_INTEGRITY_FAILED",
      action: "GET_PRODUCT",
      correlationId: "corr-integrity",
      mode: "DRY_RUN",
      live: false,
      mock: false,
      dryRun: true,
    });
    const rendered = JSON.stringify(outcome);
    expect(rendered).not.toContain(file);
    expect(rendered).not.toContain("SELECT");
    expect(rendered).not.toContain("buzzard.db");
    expect(outcome.data).toBeUndefined();
    expect(outcome.stack).toBeUndefined();
    tampered.close();
  });

  it("rejects a fake or writable connection and does not open a protected path", () => {
    const opensBefore = opens.length;
    const writable = new RealDatabase(path.join(dir, "writable-injected.sqlite"));
    writable.exec("CREATE TABLE catalog_products (id TEXT, price REAL)");
    const writableFacade = {
      capabilities: { write: true },
      queryOnly() {
        return false;
      },
      readProductForPusat() {
        return { id: "injected", price: 49, stock: 8, title: "Injected" };
      },
    };
    expect(translateGetProduct({
      catalog: writable,
      payload: { id: "injected" },
      sotActive: false,
    }).code).toBe("CATALOG_CONNECTION_REQUIRED");
    expect(translateGetProduct({
      catalog: writableFacade,
      payload: { id: "injected" },
      sotActive: false,
    })).toMatchObject({
      ok: false,
      code: "CATALOG_READ_ONLY",
      mode: "DRY_RUN",
      live: false,
      dryRun: true,
    });
    for (const dbPath of [commerceDb, workspaceDb]) {
      const refused = translateGetProduct({
        dbPath,
        payload: { id: "fiction-lamp-1" },
        sotActive: false,
      });
      expect(refused.code).toBe("CATALOG_CONNECTION_REQUIRED");
      expect(refused.data).toBeUndefined();
      expect(JSON.stringify(refused)).not.toContain("buzzard.db");
    }
    const alongside = translateGetProduct({
      catalog,
      dbPath: workspaceDb,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
    });
    expect(alongside.data.id).toBe("fiction-lamp-1");
    expect(alongside.data.price).toBeNull();
    expect(opens.length).toBe(opensBefore);
    writable.close();
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
    const loaded = loadedPaths();
    expect(loaded.some((id) => id.endsWith("/lib/pusat/runtime.js"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/productService.js") || id.endsWith("/pim/productCore.js"))).toBe(false);
    expect(loaded.some((id) => id.includes("/sinan"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/security/esatBey.js"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/lib/pusat/idempotencyService.js"))).toBe(false);
    expect(process.env.BUZZARD_SALES_ENABLED).toBeUndefined();
  });
});
