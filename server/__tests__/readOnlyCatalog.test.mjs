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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-catalog-ro-"));
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
const commerce = require("../lib/db.js");
const { createSyntheticCatalog, SYNTHETIC_CATALOG } = require("../lib/catalog/syntheticCatalogFixture.js");
const { openReadOnlyCatalog } = require("../lib/catalog/readOnlyCatalog.js");

function codeOf(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err && err.code ? err.code : err && err.message;
  }
}

function digest(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

afterAll(() => {
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("isolated read-only catalog", () => {
  it("imports without constructing SQLite or initializing the commerce proxy", () => {
    expect(opens).toEqual([]);
    expect(commerce.databaseMode).toBe("UNINITIALIZED");
    expect(codeOf(() => commerce.db.prepare("SELECT 1"))).toBe("DATABASE_NOT_INITIALIZED");
  });

  it("refuses protected paths before constructing SQLite", () => {
    const nested = path.join(dir, "server", "data");
    fs.mkdirSync(nested, { recursive: true });
    const link = path.join(dir, "commerce-link.sqlite");
    fs.symlinkSync(commerceDb, link);
    const refused = [commerceDb, workspaceDb, path.join(nested, "catalog.sqlite"), path.join(dir, "buzzard.db"), link];
    for (const candidate of refused) {
      expect(codeOf(() => createSyntheticCatalog(candidate))).toBe("DATA_PATH_REFUSED");
      expect(codeOf(() => openReadOnlyCatalog({ dbPath: candidate }))).toBe("DATA_PATH_REFUSED");
    }
    expect(codeOf(() => openReadOnlyCatalog({}))).toBe("DATA_PATH_REFUSED");
    expect(opens).toEqual([]);
  });

  it("reads the synthetic catalog and rejects writes without touching the commerce proxy", () => {
    const created = createSyntheticCatalog(synthetic);
    expect(created.path).toBe(path.resolve(synthetic));
    expect(opens).toEqual([{ filename: path.resolve(synthetic), readonly: false, fileMustExist: false }]);
    const beforeHash = digest(synthetic);
    const catalog = openReadOnlyCatalog({ dbPath: synthetic });
    expect(opens.filter((opened) => typeof opened.filename === "string")).toEqual([
      { filename: path.resolve(synthetic), readonly: false, fileMustExist: false },
      { filename: path.resolve(synthetic), readonly: true, fileMustExist: true },
    ]);
    expect(opens.filter((opened) => Buffer.isBuffer(opened.filename))).toHaveLength(1);
    expect(opens[1]).toEqual({ filename: path.resolve(synthetic), readonly: true, fileMustExist: true });
    expect(catalog.queryOnly()).toBe(true);
    expect(catalog.listTables()).toEqual([
      "catalog_brands",
      "catalog_categories",
      "catalog_identifiers",
      "catalog_media",
      "catalog_products",
      "catalog_variants",
    ]);
    expect(catalog.listCategories()).toEqual(SYNTHETIC_CATALOG.categories);
    expect(catalog.listBrands()).toEqual(SYNTHETIC_CATALOG.brands);
    expect(catalog.getProduct("FICTION-LAMP-001").title).toBe("Paper Lantern Sample");
    expect(catalog.listIdentifiers("fiction-lamp-1").map((row) => row.value)).toEqual(["FICTION-TOKEN-LAMP", "FICTION-LAMP-001"]);
    expect(catalog.listVariants("fiction-mug-1")[0].value).toBe("sample-small");
    expect(catalog.listMedia("fiction-lamp-1")[0].label).toBe("fixture-illustration-lantern");
    expect(Object.keys(catalog.getProduct("FICTION-LAMP-001"))).not.toEqual(
      expect.arrayContaining(["price", "stock", "vat", "fx"]),
    );
    for (const sql of [
      "INSERT INTO catalog_products (id, sku, title, status, visibility) VALUES ('x', 'x', 'x', 'x', 'x')",
      "UPDATE catalog_products SET title = 'changed'",
      "DELETE FROM catalog_products",
      "ALTER TABLE catalog_products ADD COLUMN price REAL",
      "DROP TABLE catalog_products",
      "CREATE TABLE commerce_orders (id TEXT)",
      "SELECT * FROM commerce_orders",
      "SELECT * FROM users",
      "SELECT * FROM commerce_idempotency",
      "SELECT * FROM core_background_jobs",
    ]) {
      expect(codeOf(() => catalog.readSql(sql))).toMatch(/CATALOG_READ_ONLY|CATALOG_SCOPE_REFUSED/);
    }
    expect(digest(synthetic)).toBe(beforeHash);
    expect(commerce.databaseMode).toBe("UNINITIALIZED");
    expect(codeOf(() => commerce.db.prepare("SELECT id FROM catalog_products"))).toBe("DATABASE_NOT_INITIALIZED");
    catalog.close();
  });

  it("serves a Pusat product view without loading Pusat memory", () => {
    const catalog = openReadOnlyCatalog({ dbPath: synthetic });
    expect(catalog.readProductForPusat("fiction-mug-1")).toEqual({
      id: "fiction-mug-1",
      sku: "FICTION-MUG-001",
      title: "Ceramic Sample Mug",
      status: "FIXTURE",
      visibility: "NON_COMMERCIAL",
      stock: null,
      price: null,
      commercialValuesStored: false,
    });
    expect(catalog.readProductForPusat("missing")).toBeNull();
    const loaded = Object.keys(require.cache).map((id) => id.replaceAll("\\", "/"));
    expect(loaded.some((id) => id.endsWith("/lib/pusat/runtime.js"))).toBe(false);
    expect(loaded.some((id) => id.includes("/sinan"))).toBe(false);
    expect(loaded.some((id) => id.endsWith("/security/esatBey.js"))).toBe(false);
    catalog.close();
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
  });

  it("matches an exact id before an exact sku and refuses an ambiguous sku", () => {
    const file = path.join(dir, "id-sku-collision.sqlite");
    const writer = new RealDatabase(file);
    writer.exec(`
      CREATE TABLE catalog_products (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        visibility TEXT NOT NULL,
        category_id TEXT,
        brand_id TEXT,
        price REAL,
        stock INTEGER
      );
      INSERT INTO catalog_products VALUES
        ('shared-key', 'OTHER-SKU', 'Id Row', 'FIXTURE', 'NON_COMMERCIAL', NULL, NULL, 49, 7),
        ('other-id', 'shared-key', 'Sku Row', 'FIXTURE', 'NON_COMMERCIAL', NULL, NULL, 19, 3),
        ('dup-a', 'DUP-SKU', 'Duplicate A', 'FIXTURE', 'NON_COMMERCIAL', NULL, NULL, 5, 1),
        ('dup-b', 'DUP-SKU', 'Duplicate B', 'FIXTURE', 'NON_COMMERCIAL', NULL, NULL, 6, 2);
    `);
    writer.close();
    const catalog = openReadOnlyCatalog({ dbPath: file });
    expect(catalog.getProduct("fiction-lamp-1")).toBeNull();
    expect(catalog.getProduct("shared-key")).toMatchObject({
      id: "shared-key",
      sku: "OTHER-SKU",
      title: "Id Row",
    });
    expect(catalog.getProduct("other-id").title).toBe("Sku Row");
    expect(catalog.getProduct("OTHER-SKU").title).toBe("Id Row");
    expect(catalog.getProduct("other-sku")).toBeNull();
    expect(catalog.getProduct("missing-key")).toBeNull();
    expect(Object.keys(catalog.getProduct("shared-key"))).not.toEqual(
      expect.arrayContaining(["price", "stock"]),
    );
    const pusat = catalog.readProductForPusat("shared-key");
    expect(pusat).toMatchObject({
      id: "shared-key",
      sku: "OTHER-SKU",
      title: "Id Row",
      stock: null,
      price: null,
    });
    expect(pusat.commercialValuesStored).toBe(false);
    expect(JSON.stringify(pusat)).not.toMatch(/"price":49|"stock":7/);
    for (const lookup of [
      () => catalog.getProduct("DUP-SKU"),
      () => catalog.readProductForPusat("DUP-SKU"),
    ]) {
      let caught = null;
      try {
        lookup();
      } catch (error) {
        caught = error;
      }
      expect(caught.code).toBe("CATALOG_KEY_AMBIGUOUS");
      expect(caught.message).toBe("CATALOG_KEY_AMBIGUOUS");
      expect(caught.data).toBeUndefined();
      expect(String(caught.stack)).not.toContain(file);
    }
    expect(catalog.getProduct("dup-a").title).toBe("Duplicate A");
    catalog.close();
  });

  it("rejects price, stock, comments, and tables outside the fixed catalog read", () => {
    const file = path.join(dir, "guard-catalog.sqlite");
    const writer = new RealDatabase(file);
    writer.exec(`
      CREATE TABLE catalog_products (
        id TEXT PRIMARY KEY, sku TEXT NOT NULL, title TEXT NOT NULL,
        status TEXT NOT NULL, visibility TEXT NOT NULL, price REAL, stock INTEGER
      );
      INSERT INTO catalog_products VALUES ('lamp-1', 'SKU-LAMP', 'Lamp', 'FIXTURE', 'NON_COMMERCIAL', 49, 7);
      CREATE TABLE users (email TEXT);
      INSERT INTO users VALUES ('secret@example.test');
      CREATE TABLE catalog_identifiers (id TEXT, product_id TEXT, kind TEXT, value TEXT);
    `);
    const insert = writer.prepare("INSERT INTO catalog_identifiers (id, product_id, kind, value) VALUES (?, ?, 'token', ?)");
    for (let index = 0; index < 101; index += 1) insert.run(`id-${index}`, "lamp-1", `token-${index}`);
    writer.close();
    const catalog = openReadOnlyCatalog({ dbPath: file });
    const allowed = catalog.readSql("SeLeCt id, sku, title, status, visibility FROM catalog_products WHERE id = ?", ["lamp-1"]);
    expect(allowed).toEqual([{
      id: "lamp-1",
      sku: "SKU-LAMP",
      title: "Lamp",
      status: "FIXTURE",
      visibility: "NON_COMMERCIAL",
    }]);
    const commented = catalog.readSql("SELECT id, sku, title, status, visibility FROM catalog_products /* price, stock */ WHERE id = ?", ["lamp-1"]);
    expect(commented[0].title).toBe("Lamp");
    expect(Object.keys(commented[0])).not.toEqual(expect.arrayContaining(["price", "stock"]));
    const attempts = [
      "SELECT price, stock FROM catalog_products",
      "SELECT/**/price,stock FROM catalog_products",
      "SeLeCt PrIcE FROM catalog_products",
      "SELECT email FROM users",
      "SELECT email FROM us/**/ers",
      "SELECT id, sku, title, status, visibility FROM catalog_products WHERE id = ? OR 1 = 1",
      "SELECT id FROM catalog_products WHERE id = 'lamp-1'",
    ];
    for (const sql of attempts) {
      let caught = null;
      try {
        catalog.readSql(sql, ["lamp-1"]);
      } catch (error) {
        caught = error;
      }
      expect(caught.code).toMatch(/CATALOG_SCOPE_REFUSED|CATALOG_READ_ONLY/);
      expect(caught.message).toBe(caught.code);
      expect(caught.stack).toBeUndefined();
      expect(JSON.stringify(caught.message)).not.toMatch(/secret@example|SELECT|price|users|lamp-1/i);
    }
    expect(codeOf(() => catalog.listIdentifiers("lamp-1"))).toBe("CATALOG_RESULT_LIMIT");
    catalog.close();
    for (const call of [
      () => catalog.getProduct("lamp-1"),
      () => catalog.readProductForPusat("lamp-1"),
      () => catalog.listIdentifiers("lamp-1"),
      () => catalog.listVariants("lamp-1"),
      () => catalog.listMedia("lamp-1"),
      () => catalog.listTables(),
      () => catalog.listCategories(),
      () => catalog.listBrands(),
      () => catalog.readSql("SELECT id, sku, title, status, visibility FROM catalog_products WHERE id = ?", ["lamp-1"]),
      () => catalog.queryOnly(),
      () => catalog.identity(),
      () => catalog.path,
    ]) {
      expect(codeOf(call)).toBe("CATALOG_CONNECTION_REQUIRED");
    }
  });

  it("leaves both protected databases untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
    expect(process.env.BUZZARD_SALES_ENABLED).toBeUndefined();
    const opened = opens.filter((opened) => typeof opened.filename === "string").map((opened) => opened.filename);
    expect(opened.every((filename) => filename.startsWith(dir + path.sep))).toBe(true);
    expect(opened).not.toContain(path.resolve(commerceDb));
    expect(opened).not.toContain(path.resolve(workspaceDb));
  });
});
