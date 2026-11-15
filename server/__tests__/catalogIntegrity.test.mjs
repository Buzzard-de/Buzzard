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
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-catalog-integrity-"));
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
const { adaptGetProduct } = require("../lib/catalog/pusatGetProductAdapter.js");
const { createSyntheticCatalog } = require("../lib/catalog/syntheticCatalogFixture.js");
const { openReadOnlyCatalog } = require("../lib/catalog/readOnlyCatalog.js");
const commerce = require("../lib/db.js");

const sessions = [];

function openSynthetic(file, options) {
  const session = openReadOnlyCatalog({ dbPath: file, ...options });
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

function sha256(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function loadedPaths() {
  return Object.keys(require.cache).map((id) => id.replaceAll("\\", "/"));
}

function freshCatalog(name) {
  const file = path.join(dir, name);
  createSyntheticCatalog(file);
  return { file, catalog: openSynthetic(file) };
}

function rewriteSameInode(file, mutate) {
  const before = fs.statSync(file);
  const bytes = fs.readFileSync(file);
  const next = mutate(Buffer.from(bytes), before);
  const writer = fs.openSync(file, "r+");
  fs.writeSync(writer, next, 0, next.length, 0);
  if (next.length < before.size) fs.ftruncateSync(writer, next.length);
  fs.closeSync(writer);
  return before;
}

const clean = freshCatalog("clean-catalog.sqlite");

afterAll(() => {
  for (const session of sessions) {
    try { session.close(); } catch { /* already closed */ }
  }
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("catalog integrity", () => {
  it("reads the synthetic catalog and records path, inode, size, mtime, and sha256", () => {
    const recorded = clean.catalog.identity();
    const stat = fs.statSync(clean.file);
    expect(recorded.path).toBe(path.resolve(clean.file));
    expect(recorded.ino).toBe(stat.ino);
    expect(recorded.size).toBe(stat.size);
    expect(recorded.mtimeMs).toBe(stat.mtimeMs);
    expect(recorded.sha256).toBe(sha256(clean.file));
    const result = adaptGetProduct({
      catalog: clean.catalog,
      payload: { id: "fiction-lamp-1" },
      sotActive: false,
      correlationId: "corr-clean",
      actorId: "fixture-reader",
    });
    expect(Object.keys(result.data)).toEqual(["id", "sku", "title", "status", "visibility", "stock", "price"]);
    expect(result.data).toMatchObject({
      id: "fiction-lamp-1",
      sku: "FICTION-LAMP-001",
      title: "Paper Lantern Sample",
      stock: null,
      price: null,
    });
    expect(result.mode).toBe("DRY_RUN");
    expect(result.live).toBe(false);
    expect(result.mock).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(clean.catalog.identity().sha256).toBe(recorded.sha256);
  });

  it("stops reading when the same inode is modified", () => {
    const { file, catalog } = freshCatalog("same-inode.sqlite");
    const before = fs.statSync(file);
    const opensBefore = opens.length;
    rewriteSameInode(file, (bytes) => {
      bytes[20] ^= 0xff;
      return bytes;
    });
    const after = fs.statSync(file);
    expect(after.ino).toBe(before.ino);
    expect(sha256(file)).not.toBe(catalog.identity().sha256);
    let outcome;
    try {
      outcome = adaptGetProduct({
        catalog,
        payload: { id: "fiction-lamp-1" },
        sotActive: false,
      });
    } catch (error) {
      outcome = error;
    }
    expect(outcome).toBeInstanceOf(Error);
    expect(outcome.code).toBe("CATALOG_INTEGRITY_FAILED");
    expect(outcome.data).toBeUndefined();
    expect(codeOf(() => catalog.readProductForPusat("fiction-lamp-1"))).toBe("CATALOG_INTEGRITY_FAILED");
    expect(opens.length).toBe(opensBefore);
  });

  it("stops reading when a different inode replaces the path", () => {
    const { file, catalog } = freshCatalog("replaced-inode.sqlite");
    const replacement = path.join(dir, "replaced-inode-copy.sqlite");
    const before = fs.statSync(file);
    fs.copyFileSync(file, replacement);
    fs.renameSync(file, path.join(dir, "replaced-inode-old.sqlite"));
    fs.renameSync(replacement, file);
    expect(fs.statSync(file).ino).not.toBe(before.ino);
    expect(sha256(file)).toBe(catalog.identity().sha256);
    const opensBefore = opens.length;
    expect(codeOf(() => catalog.readProductForPusat("fiction-lamp-1"))).toBe("CATALOG_INTEGRITY_FAILED");
    expect(codeOf(() => catalog.getProduct("fiction-lamp-1"))).toBe("CATALOG_INTEGRITY_FAILED");
    expect(opens.length).toBe(opensBefore);
  });

  it("stops reading when the path becomes a symlink", () => {
    const { file, catalog } = freshCatalog("symlink-source.sqlite");
    const target = path.join(dir, "symlink-target.sqlite");
    createSyntheticCatalog(target);
    const writer = new RealDatabase(target);
    writer.prepare("UPDATE catalog_products SET title = ? WHERE id = ?").run("Redirected Title", "fiction-lamp-1");
    writer.close();
    const opensBefore = opens.length;
    fs.renameSync(file, path.join(dir, "symlink-source-old.sqlite"));
    fs.symlinkSync(target, file);
    expect(codeOf(() => catalog.readProductForPusat("fiction-lamp-1"))).toBe("CATALOG_INTEGRITY_FAILED");
    expect(opens.length).toBe(opensBefore);
    expect(opens.includes(path.resolve(target))).toBe(true);
    expect(opens.filter((opened) => opened === path.resolve(target))).toHaveLength(1);
  });

  it("detects a byte change when size and mtime are restored", () => {
    const file = path.join(dir, "same-stamp.sqlite");
    createSyntheticCatalog(file);
    const fixed = new Date("2020-01-01T00:00:00.000Z");
    fs.utimesSync(file, fixed, fixed);
    const catalog = openSynthetic(file);
    const before = fs.statSync(file);
    const originalHash = sha256(file);
    rewriteSameInode(file, (bytes) => {
      bytes[bytes.length - 1] ^= 0x5a;
      return bytes;
    });
    fs.utimesSync(file, fixed, fixed);
    const after = fs.statSync(file);
    expect(after.ino).toBe(before.ino);
    expect(after.size).toBe(before.size);
    expect(Math.trunc(after.mtimeMs)).toBe(Math.trunc(before.mtimeMs));
    expect(sha256(file)).not.toBe(originalHash);
    expect(codeOf(() => catalog.readProductForPusat("fiction-mug-1"))).toBe("CATALOG_INTEGRITY_FAILED");
  });

  it("discards a result when the file changes during the read", () => {
    const file = path.join(dir, "during-read.sqlite");
    createSyntheticCatalog(file);
    let changed = false;
    const catalog = openSynthetic(file, {
      integrityProbe(phase) {
        if (phase === "before-query" && !changed) {
          changed = true;
          rewriteSameInode(file, (bytes) => {
            bytes[30] ^= 0xff;
            return bytes;
          });
        }
      },
    });
    let outcome;
    try {
      outcome = catalog.readProductForPusat("fiction-lamp-1");
    } catch (error) {
      outcome = error;
    }
    expect(changed).toBe(true);
    expect(outcome).toBeInstanceOf(Error);
    expect(outcome.code).toBe("CATALOG_INTEGRITY_FAILED");
    expect(outcome.title).toBeUndefined();
    expect(codeOf(() => catalog.readProductForPusat("fiction-lamp-1"))).toBe("CATALOG_INTEGRITY_FAILED");
  });

  it("serves the open snapshot when a transient change is fully restored", () => {
    const file = path.join(dir, "restored-read.sqlite");
    createSyntheticCatalog(file);
    const fixed = new Date("2020-01-01T00:00:00.000Z");
    fs.utimesSync(file, fixed, fixed);
    const original = fs.readFileSync(file);
    const catalog = openSynthetic(file, {
      integrityProbe(phase) {
        if (phase === "before-query") {
          rewriteSameInode(file, (bytes) => {
            bytes[30] ^= 0xff;
            return bytes;
          });
        }
        if (phase === "after-query") {
          const writer = fs.openSync(file, "r+");
          fs.writeSync(writer, original, 0, original.length, 0);
          fs.closeSync(writer);
          fs.utimesSync(file, fixed, fixed);
        }
      },
    });
    const result = catalog.readProductForPusat("fiction-lamp-1");
    expect(result.title).toBe("Paper Lantern Sample");
    expect(result.price).toBeNull();
    expect(result.stock).toBeNull();
    expect(sha256(file)).toBe(catalog.identity().sha256);
    expect(Math.trunc(fs.statSync(file).mtimeMs)).toBe(Math.trunc(catalog.identity().mtimeMs));
  });

  it("does not reopen or fall back after an integrity failure", () => {
    const { file, catalog } = freshCatalog("stay-failed.sqlite");
    rewriteSameInode(file, (bytes) => {
      bytes[40] ^= 0x11;
      return bytes;
    });
    const opensBefore = opens.length;
    expect(codeOf(() => adaptGetProduct({
      catalog,
      payload: { sku: "FICTION-LAMP-001" },
      sotActive: false,
      source: "CATALOG_FIXTURE",
    }))).toBe("CATALOG_INTEGRITY_FAILED");
    expect(codeOf(() => adaptGetProduct({
      catalog,
      payload: { sku: "FICTION-LAMP-001" },
      sotActive: false,
    }))).toBe("CATALOG_INTEGRITY_FAILED");
    expect(opens.length).toBe(opensBefore);
    expect(catalog.path).toBe(path.resolve(file));
  });

  it("leaves the commerce proxy uninitialized and does not load Pusat, Sinan, or Esat", () => {
    expect(commerce.databaseMode).toBe("UNINITIALIZED");
    expect(codeOf(() => commerce.db.prepare("SELECT 1"))).toBe("DATABASE_NOT_INITIALIZED");
    const loaded = loadedPaths();
    for (const forbidden of [
      "/lib/pusat/runtime.js",
      "/lib/pusat/idempotencyService.js",
      "/security/esatBey.js",
      "/productService.js",
      "/productSot.js",
    ]) {
      expect(loaded.some((id) => id.endsWith(forbidden)), forbidden).toBe(false);
    }
    expect(loaded.some((id) => id.includes("/sinan"))).toBe(false);
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(pusatMemory)).toEqual(pusatBefore);
    expect(opens.every((opened) => opened === ":memory:" || opened.startsWith(dir + path.sep))).toBe(true);
    expect(process.env.BUZZARD_SALES_ENABLED).toBeUndefined();
    const source = fs.readFileSync(path.join(repoRoot, "server/lib/catalog/readOnlyCatalog.js"), "utf8");
    expect(source.includes("immutable=1")).toBe(false);
  });
});
