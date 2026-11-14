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

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const workspaceBefore = fileMark(workspaceDb);
const previousSales = process.env.BUZZARD_SALES_ENABLED;
const previousBypass = process.env.BUZZARD_SALES_GATE_BYPASS;
const previousDbPath = process.env.BUZZARD_DB_PATH;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-db-readonly-"));
const synthetic = path.join(dir, "approved-readonly.sqlite");
const sqliteId = serverRequire.resolve("better-sqlite3");
const RealDatabase = serverRequire("better-sqlite3");
const opens = [];

function CountingDatabase(filename, options) {
  const instance = new RealDatabase(filename, options);
  const record = {
    filename,
    options: options ? { readonly: options.readonly, fileMustExist: options.fileMustExist } : undefined,
    exec: 0,
    closed: false,
  };
  opens.push(record);
  const exec = instance.exec.bind(instance);
  const close = instance.close.bind(instance);
  instance.exec = (sql) => {
    record.exec += 1;
    return exec(sql);
  };
  instance.close = () => {
    record.closed = true;
    return close();
  };
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
delete process.env.BUZZARD_DB_PATH;
process.env.BUZZARD_SALES_GATE_BYPASS = "1";

const dbModule = require("../lib/db.js");
const { db } = dbModule;

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
  if (previousBypass === undefined) delete process.env.BUZZARD_SALES_GATE_BYPASS;
  else process.env.BUZZARD_SALES_GATE_BYPASS = previousBypass;
  if (previousDbPath === undefined) delete process.env.BUZZARD_DB_PATH;
  else process.env.BUZZARD_DB_PATH = previousDbPath;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("read-only database initialization", () => {
  it("imports without constructing SQLite", () => {
    expect(opens).toEqual([]);
    expect(dbModule.databaseMode).toBe("UNINITIALIZED");
    expect(dbModule.getDatabaseHealth()).toMatchObject({
      mode: "UNINITIALIZED",
      queryOnly: false,
      path: null,
      code: "DATABASE_NOT_INITIALIZED",
      salesOpen: false,
      egressAllowed: false,
      productionReady: false,
    });
  });

  it("rejects a user-controlled mode string and a missing path before SQLite", () => {
    expect(codeOf(() => dbModule.initializeDatabase({ dbPath: synthetic, mode: "READ_ONLY" }))).toBe("DATABASE_MODE_REFUSED");
    expect(codeOf(() => dbModule.initializeDatabase({ dbPath: synthetic, mode: "WRITE_ENABLED" }))).toBe("DATABASE_MODE_REFUSED");
    expect(codeOf(() => dbModule.initializeDatabase({ mode: dbModule.DatabaseMode.READ_ONLY }))).toBe("DATA_PATH_REFUSED");
    process.env.BUZZARD_DB_PATH = commerceDb;
    expect(codeOf(() => dbModule.initializeDatabase({ mode: dbModule.DatabaseMode.READ_ONLY }))).toBe("DATA_PATH_REFUSED");
    delete process.env.BUZZARD_DB_PATH;
    expect(codeOf(() => dbModule.initializeDatabase({
      dbPath: path.join(dir, "missing-readonly.sqlite"),
      mode: dbModule.DatabaseMode.READ_ONLY,
    }))).toBe("DATABASE_FILE_REQUIRED");
    expect(opens).toEqual([]);
  });

  it("rejects protected paths and symlink targets before SQLite", () => {
    const nested = path.join(dir, "server", "data");
    fs.mkdirSync(nested, { recursive: true });
    const link = path.join(dir, "commerce-link.sqlite");
    const broken = path.join(dir, "broken-link.sqlite");
    fs.symlinkSync(commerceDb, link);
    fs.symlinkSync(path.join(dir, "absent.sqlite"), broken);
    const refused = [
      commerceDb,
      workspaceDb,
      path.join(nested, "synthetic.sqlite"),
      path.join(dir, "buzzard.db"),
      path.join(dir, "buzzard_guardian.sqlite"),
      link,
      broken,
    ];
    for (const candidate of refused) {
      expect(codeOf(() => dbModule.initializeDatabase({
        dbPath: candidate,
        mode: dbModule.DatabaseMode.READ_ONLY,
      }))).toBe("DATA_PATH_REFUSED");
    }
    expect(opens).toEqual([]);
  });

  it("opens an approved synthetic database in query_only mode without creating schema", () => {
    const setup = new RealDatabase(synthetic);
    setup.exec(`
      CREATE TABLE users (id INTEGER);
      CREATE TABLE products (id INTEGER);
      CREATE TABLE orders (id INTEGER);
      CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO items(name) VALUES ('alpha');
    `);
    setup.close();
    const beforeHash = digest(synthetic);
    const reader = new RealDatabase(synthetic, { readonly: true, fileMustExist: true });
    const beforeTables = reader.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    reader.close();
    const opened = dbModule.initializeDatabase({
      dbPath: synthetic,
      mode: dbModule.DatabaseMode.READ_ONLY,
    });
    expect(opened).toMatchObject({
      ok: true,
      mode: "READ_ONLY",
      path: path.resolve(synthetic),
      persisted: false,
      queryOnly: true,
      reused: false,
    });
    expect(opens).toHaveLength(1);
    expect(opens[0].filename).toBe(path.resolve(synthetic));
    expect(opens[0].options).toEqual({ readonly: true, fileMustExist: true });
    expect(opens[0].exec).toBe(0);
    expect(db.readonly).toBe(true);
    expect(db.prepare("PRAGMA query_only").get().query_only).toBe(1);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    expect(tables).toEqual(beforeTables);
    expect(db.prepare("SELECT name FROM items").get().name).toBe("alpha");
    expect(digest(synthetic)).toBe(beforeHash);
  });

  it("rejects writes and keeps the synthetic rows unchanged", () => {
    const beforeHash = digest(synthetic);
    const writes = [
      () => db.prepare("INSERT INTO items(name) VALUES (?)").run("beta"),
      () => db.exec("UPDATE items SET name = 'beta'"),
      () => db.exec("DELETE FROM items"),
      () => db.exec("ALTER TABLE items ADD COLUMN extra TEXT"),
      () => db.exec("DROP TABLE items"),
      () => db.exec("CREATE TABLE extra (id INTEGER)"),
      () => db.exec("SELECT name FROM items; DROP TABLE items"),
      () => db.pragma("query_only = OFF"),
    ];
    for (const write of writes) expect(codeOf(write)).toBe("DATABASE_READ_ONLY");
    expect(db.prepare("SELECT name FROM items").get().name).toBe("alpha");
    expect(digest(synthetic)).toBe(beforeHash);
    expect(opens).toHaveLength(1);
  });

  it("reports read-only health and persistence without secret fields", () => {
    const health = dbModule.getDatabaseHealth();
    const persistence = dbModule.getPersistenceInfo();
    expect(health).toMatchObject({
      enabled: false,
      readable: true,
      mode: "READ_ONLY",
      queryOnly: true,
      path: path.resolve(synthetic),
      users: 0,
      products: 0,
      orders: 0,
      salesOpen: false,
      egressAllowed: false,
      productionReady: false,
    });
    expect(persistence).toEqual({
      initialized: true,
      path: path.resolve(synthetic),
      accessMode: "READ_ONLY",
      queryOnly: true,
      storageMode: "development_default",
      persistent: false,
      ephemeralRisk: null,
      syncHint: null,
    });
    const text = JSON.stringify({ health, persistence });
    expect(text).not.toMatch(/backupDir|renderDisk|envBuzzard|password|secret|token|apiKey/i);
    expect(text).not.toContain(commerceDb);
  });

  it("drops the read connection when a later path is refused", () => {
    const again = dbModule.initializeDatabase({
      dbPath: synthetic,
      mode: dbModule.DatabaseMode.READ_ONLY,
    });
    expect(again.reused).toBe(true);
    expect(opens).toHaveLength(1);
    expect(codeOf(() => dbModule.initializeDatabase({
      dbPath: commerceDb,
      mode: dbModule.DatabaseMode.READ_ONLY,
    }))).toBe("DATA_PATH_REFUSED");
    expect(opens).toHaveLength(1);
    expect(opens[0].closed).toBe(true);
    expect(codeOf(() => db.prepare("SELECT name FROM items"))).toBe("DATABASE_NOT_INITIALIZED");
    expect(dbModule.databaseMode).toBe("UNINITIALIZED");
    expect(dbModule.dbPath).toBeNull();
    expect(fs.readdirSync(dir).some((name) => name === "buzzard.db")).toBe(false);
  });

  it("keeps write initialization blocked while sales are closed", () => {
    const before = opens.length;
    expect(codeOf(() => dbModule.initializeDatabase({
      dbPath: synthetic,
      mode: dbModule.DatabaseMode.WRITE_ENABLED,
    }))).toBe("SALES_CLOSED");
    expect(opens).toHaveLength(before);
    expect(dbModule.databaseMode).toBe("UNINITIALIZED");
    const reopened = dbModule.initializeDatabase({
      dbPath: synthetic,
      mode: dbModule.DatabaseMode.READ_ONLY,
    });
    expect(reopened.mode).toBe("READ_ONLY");
    expect(opens).toHaveLength(before + 1);
    expect(opens.at(-1).filename).toBe(path.resolve(synthetic));
    expect(db.prepare("SELECT COUNT(*) n FROM items").get().n).toBe(1);
  });

  it("leaves both protected databases untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(opens.every((opened) => opened.filename === path.resolve(synthetic))).toBe(true);
  });
});
