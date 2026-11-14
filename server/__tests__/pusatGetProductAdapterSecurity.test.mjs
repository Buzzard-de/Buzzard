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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-adapter-security-"));
const synthetic = path.join(dir, "synthetic-catalog.sqlite");
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");
const opens = [];

function CountingDatabase(filename, options) {
  const instance = new RealDatabase(filename, options);
  opens.push(path.resolve(String(filename)));
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
const { adaptGetProduct } = require("../lib/catalog/pusatGetProductAdapter.js");
const { createSyntheticCatalog } = require("../lib/catalog/syntheticCatalogFixture.js");
const { openReadOnlyCatalog } = require("../lib/catalog/readOnlyCatalog.js");

const sessions = [];

function openSynthetic(file) {
  const session = openReadOnlyCatalog({ dbPath: file });
  sessions.push(session);
  return session;
}

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

function dryRun(result) {
  expect(result.mode).toBe("DRY_RUN");
  expect(result.live).toBe(false);
  expect(result.mock).toBe(false);
  expect(result.dryRun).toBe(true);
  expect(result.productionReady).toBeUndefined();
  expect(result.salesOpen).toBeUndefined();
  expect(result.egressAllowed).toBeUndefined();
}

createSyntheticCatalog(synthetic);
const catalog = openSynthetic(synthetic);
const fixtureHash = digest(synthetic);

function read(payload, extra = {}) {
  return adaptGetProduct({
    catalog,
    payload,
    sotActive: false,
    correlationId: "corr-security",
    ...extra,
  });
}

afterAll(() => {
  for (const session of sessions) {
    try { session.close(); } catch { /* already closed sessions stay closed */ }
  }
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("Pusat catalog adapter security", () => {
  it("accepts only a live read-only catalog session", () => {
    const calls = [];
    const impostor = {
      capabilities: { write: false, sales: true, egress: true, productionReady: true },
      queryOnly() {
        calls.push("query");
        return true;
      },
      readProductForPusat() {
        calls.push("read");
        return { id: "injected", price: 49, stock: 8, vat: 19 };
      },
    };
    expect(codeOf(() => adaptGetProduct({
      catalog: impostor,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
    }))).toBe("CATALOG_CONNECTION_REQUIRED");
    expect(calls).toEqual([]);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(catalog.capabilities.write).toBe(false);
    expect(catalog.capabilities.productionReady).toBe(false);
    expect(read({ id: "fiction-lamp-1" }).ok).toBe(true);
  });

  it("returns a coded error for a missing, broken, or closed connection", () => {
    expect(codeOf(() => adaptGetProduct({
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
    }))).toBe("CATALOG_CONNECTION_REQUIRED");
    for (const broken of [null, {}, { readProductForPusat: "nope" }, synthetic, commerceDb]) {
      expect(codeOf(() => adaptGetProduct({
        catalog: broken,
        payload: { sku: "FICTION-LAMP-001" },
        sotActive: false,
      }))).toBe("CATALOG_CONNECTION_REQUIRED");
    }
    const closedFile = path.join(dir, "closed-catalog.sqlite");
    createSyntheticCatalog(closedFile);
    const closed = openSynthetic(closedFile);
    closed.close();
    let caught = null;
    try {
      adaptGetProduct({ catalog: closed, payload: { id: "fiction-lamp-1" }, sotActive: false });
    } catch (error) {
      caught = error;
    }
    expect(caught.code).toBe("CATALOG_CONNECTION_REQUIRED");
    expect(String(caught.message)).not.toMatch(/not open|buzzard\.db/i);
  });

  it("rejects an injected writable SQLite connection before reading it", () => {
    const injectedPath = path.join(dir, "injected-writable.sqlite");
    const injected = new CountingDatabase(injectedPath);
    injected.exec("CREATE TABLE catalog_products (id TEXT PRIMARY KEY, price REAL, stock INTEGER)");
    injected.prepare("INSERT INTO catalog_products (id, price, stock) VALUES (?, ?, ?)").run("injected", 49, 8);
    const before = digest(injectedPath);
    const opensBefore = opens.length;
    const calls = [];
    const writableFacade = {
      capabilities: { write: true },
      queryOnly() {
        calls.push("query");
        return false;
      },
      readProductForPusat() {
        calls.push("read");
        return { id: "injected", price: 49, stock: 8 };
      },
    };
    expect(codeOf(() => adaptGetProduct({
      catalog: injected,
      payload: { id: "injected" },
      sotActive: false,
    }))).toBe("CATALOG_CONNECTION_REQUIRED");
    expect(codeOf(() => adaptGetProduct({
      catalog: writableFacade,
      payload: { id: "injected" },
      sotActive: false,
    }))).toBe("CATALOG_READ_ONLY");
    expect(calls).toEqual([]);
    expect(digest(injectedPath)).toBe(before);
    expect(opens.length).toBe(opensBefore);
    injected.close();
  });

  it("keeps the open handle when the path or session surface is changed", () => {
    expect(() => { catalog.path = workspaceDb; }).toThrow(TypeError);
    expect(catalog.path).toBe(path.resolve(synthetic));
    expect(() => { catalog.readProductForPusat = () => ({ id: "replaced", price: 10, stock: 4 }); }).toThrow(TypeError);
    expect(() => { catalog.capabilities.write = true; }).toThrow(TypeError);
    expect(() => { catalog.capabilities.productionReady = true; }).toThrow(TypeError);
    expect(catalog.capabilities.write).toBe(false);
    expect(catalog.capabilities.productionReady).toBe(false);

    const renamedFile = path.join(dir, "rename-catalog.sqlite");
    const replacement = path.join(dir, "rename-replacement.sqlite");
    createSyntheticCatalog(renamedFile);
    const renamed = openSynthetic(renamedFile);
    const openedInode = fs.statSync(renamedFile).ino;
    createSyntheticCatalog(replacement);
    const writer = new CountingDatabase(replacement);
    writer.prepare("UPDATE catalog_products SET title = ? WHERE id = ?").run("Renamed Title", "fiction-lamp-1");
    writer.close();
    fs.renameSync(renamedFile, path.join(dir, "rename-old.sqlite"));
    fs.renameSync(replacement, renamedFile);
    expect(fs.statSync(renamedFile).ino).not.toBe(openedInode);
    const kept = adaptGetProduct({
      catalog: renamed,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
    });
    expect(kept.data.title).toBe("Paper Lantern Sample");
    expect(kept.data.price).toBeNull();
    renamed.close();
  });

  it("treats injection-shaped ids and skus as ordinary values", () => {
    const injections = [
      "' OR 1=1 --",
      "fiction-lamp-1' OR '1'='1",
      "fiction-lamp-1; DROP TABLE catalog_products; --",
      "fiction-lamp-1' UNION SELECT id, sku, title, status, visibility, category_id, brand_id FROM catalog_products --",
      "fiction-lamp-1' UNION SELECT sql, sql, sql, sql, sql, sql, sql FROM sqlite_master --",
      "FICTION-LAMP-001' OR sku LIKE '%",
      "%",
      "_",
    ];
    for (const value of injections) {
      expect(read({ id: value }).code).toBe("NOT_FOUND");
      expect(read({ sku: value }).code).toBe("NOT_FOUND");
    }
    const mixed = read({ id: "fiction-lamp-1", sku: "' OR 1=1 --" });
    expect(mixed.data).toMatchObject({ id: "fiction-lamp-1", sku: "FICTION-LAMP-001", price: null, stock: null });
    expect(catalog.listTables()).toEqual([
      "catalog_brands",
      "catalog_categories",
      "catalog_identifiers",
      "catalog_media",
      "catalog_products",
      "catalog_variants",
    ]);
    expect(digest(synthetic)).toBe(fixtureHash);
  });

  it("does not let payload fields add tables or columns to the lookup", () => {
    const result = read({
      id: "fiction-lamp-1",
      table: "users",
      from: "payments",
      columns: "password, price, stock, vat, fx",
      sql: "SELECT price, stock FROM commerce_orders",
    }, { correlationId: "'; DROP TABLE catalog_products; --" });
    expect(result.ok).toBe(true);
    expect(result.data.id).toBe("fiction-lamp-1");
    expect(Object.keys(result.data)).toEqual(["id", "sku", "title", "status", "visibility", "stock", "price"]);
    expect(codeOf(() => catalog.readSql("SELECT password FROM users"))).toBe("CATALOG_SCOPE_REFUSED");
    let unknownColumn = null;
    try {
      catalog.readSql("SELECT price, stock, vat, fx FROM catalog_products");
    } catch (error) {
      unknownColumn = error;
    }
    expect(unknownColumn.code).toBe("SQLITE_ERROR");
    expect(unknownColumn.message).toMatch(/no such column/i);
    expect(codeOf(() => catalog.readSql("ATTACH DATABASE 'injected.sqlite' AS outside"))).toBe("CATALOG_READ_ONLY");
    const columns = catalog.readSql("SELECT name FROM pragma_table_info('catalog_products')").map((row) => row.name);
    expect(columns).toEqual(["id", "sku", "title", "status", "visibility", "category_id", "brand_id"]);
    expect(digest(synthetic)).toBe(fixtureHash);
  });

  it("ignores privilege fields carried inside the payload", () => {
    const polluted = JSON.parse('{"id":"fiction-lamp-1","__proto__":{"live":true,"mode":"LIVE","productionReady":true}}');
    const result = adaptGetProduct({
      catalog,
      payload: {
        ...polluted,
        source: "D",
        sotActive: true,
        actorId: "root",
        correlationId: "hijack",
        mode: "LIVE",
        live: true,
        mock: true,
        dryRun: false,
        mappingStatus: "MAPPED",
        productionReady: true,
        salesOpen: true,
        egressAllowed: true,
      },
      sotActive: false,
      actorId: "fixture-reader",
      correlationId: "caller-corr",
    });
    expect(result.source).toBe("UNKNOWN");
    expect(result.sotActive).toBe(false);
    expect(result.actorId).toBe("fixture-reader");
    expect(result.correlationId).toBe("caller-corr");
    expect(result.mappingStatus).toBe("CANDIDATE");
    dryRun(result);
    expect(Object.prototype.live).toBeUndefined();
    expect(Object.prototype.productionReady).toBeUndefined();

    const explicit = read({ id: "fiction-mug-1" }, { source: "LIVE", sotActive: true, actorId: { admin: true } });
    expect(explicit.source).toBe("LIVE");
    expect(explicit.sotActive).toBe(true);
    expect(explicit.mappingStatus).toBe("CANDIDATE");
    dryRun(explicit);
    expect(explicit.productionReady).toBeUndefined();
  });

  it("accepts only a caller boolean for sotActive", () => {
    const calls = [];
    const impostor = {
      capabilities: { write: false },
      queryOnly() {
        calls.push("query");
        return true;
      },
      readProductForPusat() {
        calls.push("read");
        return { id: "fiction-lamp-1" };
      },
    };
    for (const sotActive of ["true", "false", 1, 0, null, undefined, {}, [], "1", new Boolean(false)]) {
      expect(codeOf(() => adaptGetProduct({
        catalog: impostor,
        payload: { id: "fiction-lamp-1" },
        sotActive,
      }))).toBe("SOT_ACTIVE_REQUIRED");
    }
    expect(calls).toEqual([]);
    expect(read({ id: "fiction-lamp-1" }, { sotActive: true }).sotActive).toBe(true);
    expect(read({ id: "fiction-lamp-1" }, { sotActive: false }).sotActive).toBe(false);
  });

  it("drops commercial fields added around the catalog row", () => {
    const detached = catalog.readProductForPusat("fiction-lamp-1");
    detached.price = 49;
    detached.stock = 8;
    detached.vat = 19;
    detached.fx = 1.1;
    detached.currency = "EUR";
    detached.purchasable = true;
    const result = read({ id: "fiction-lamp-1" });
    expect(Object.keys(result.data)).toEqual(["id", "sku", "title", "status", "visibility", "stock", "price"]);
    expect(result.data.price).toBeNull();
    expect(result.data.stock).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/commercialValuesStored|purchasable|"vat"|"fx"|"currency"/);

    const base = path.join(dir, "priced-base.sqlite");
    const donor = path.join(dir, "priced-donor.sqlite");
    createSyntheticCatalog(base);
    const priced = openSynthetic(base);
    createSyntheticCatalog(donor);
    const writer = new CountingDatabase(donor);
    writer.exec("ALTER TABLE catalog_products ADD COLUMN price REAL");
    writer.exec("ALTER TABLE catalog_products ADD COLUMN stock INTEGER");
    writer.prepare("UPDATE catalog_products SET title = ?, price = ?, stock = ? WHERE id = ?")
      .run("Priced Sample", 49, 8, "fiction-lamp-1");
    writer.close();
    const opensBefore = opens.length;
    fs.copyFileSync(donor, base);
    let outcome;
    try {
      outcome = adaptGetProduct({ catalog: priced, payload: { id: "fiction-lamp-1" }, sotActive: false });
    } catch (error) {
      outcome = error;
    }
    if (outcome instanceof Error) {
      expect(outcome.code).toBe("CATALOG_CONNECTION_REQUIRED");
    } else {
      expect(outcome.data.price).toBeNull();
      expect(outcome.data.stock).toBeNull();
      expect(Object.keys(outcome.data)).toEqual(["id", "sku", "title", "status", "visibility", "stock", "price"]);
      dryRun(outcome);
    }
    expect(opens.length).toBe(opensBefore);
    priced.close();
  });

  it("preserves the dry-run label on success and failure", () => {
    dryRun(read({ id: "fiction-lamp-1" }));
    dryRun(read({ sku: "missing-sku" }));
    dryRun(read({}));
    expect(read({}).code).toBe("INVALID_PAYLOAD");
    expect(read({ sku: "missing-sku" }).code).toBe("NOT_FOUND");
  });

  it("does not load commerce, Pusat memory, Sinan, Esat, or idempotency modules", () => {
    const loaded = loadedPaths();
    for (const forbidden of [
      "/lib/db.js",
      "/lib/pusat/runtime.js",
      "/lib/pusat/idempotencyService.js",
      "/security/esatBey.js",
      "/productService.js",
      "/productSot.js",
    ]) {
      expect(loaded.some((id) => id.endsWith(forbidden))).toBe(false);
    }
    expect(loaded.some((id) => id.includes("/sinan"))).toBe(false);
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
    expect(opens.every((opened) => opened.startsWith(dir + path.sep))).toBe(true);
    expect(process.env.BUZZARD_SALES_ENABLED).toBeUndefined();
    expect(digest(synthetic)).toBe(fixtureHash);
  });
});
