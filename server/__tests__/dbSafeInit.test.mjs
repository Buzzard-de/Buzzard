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
const ordersPath = path.join(repoRoot, "server/data/orders.json");

function fileMark(file) {
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
}

const dbBefore = fileMark(commerceDb);
const workspaceBefore = fileMark(workspaceDb);
const ordersBefore = fileMark(ordersPath);
const previousSales = process.env.BUZZARD_SALES_ENABLED;
const previousBypass = process.env.BUZZARD_SALES_GATE_BYPASS;
const previousDbPath = process.env.BUZZARD_DB_PATH;
const previousE2e = process.env.BUZZARD_E2E_DB;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-db-safe-init-"));
const approvedA = path.join(dir, "synthetic-a.sqlite");
const approvedB = path.join(dir, "synthetic-b.sqlite");
const opens = [];
const sql = [];

function Database(filename) {
  opens.push(filename);
  this.filename = filename;
  this.closed = false;
  this.prepareCalls = 0;
  this.pragma = (statement) => {
    sql.push(["pragma", this.filename, String(statement)]);
  };
  this.exec = (statement) => {
    sql.push(["exec", this.filename, String(statement)]);
  };
  this.prepare = (statement) => {
    this.prepareCalls += 1;
    sql.push(["prepare", this.filename, String(statement)]);
    const row = new Proxy(
      { n: 0 },
      {
        get(target, prop) {
          if (prop in target) return target[prop];
          if (prop === "name" || prop === "slug") return "";
          return 0;
        },
      },
    );
    return {
      run() {
        sql.push(["run", filename, String(statement)]);
        return { changes: 0 };
      },
      get() {
        return row;
      },
      all() {
        return [];
      },
      iterate() {
        return [];
      },
    };
  };
  this.transaction = (fn) => {
    const wrapped = (...args) => fn(...args);
    wrapped.immediate = wrapped;
    return wrapped;
  };
  this.close = () => {
    this.closed = true;
  };
}

const sqliteId = serverRequire.resolve("better-sqlite3");
const realSqlite = serverRequire.cache[sqliteId];
serverRequire.cache[sqliteId] = {
  id: sqliteId,
  filename: sqliteId,
  loaded: true,
  exports: Database,
};

delete process.env.BUZZARD_SALES_ENABLED;
delete process.env.BUZZARD_DB_PATH;
delete process.env.BUZZARD_E2E_DB;
process.env.BUZZARD_SALES_GATE_BYPASS = "1";

const dbModule = require("../lib/db.js");
const { db } = dbModule;

function writeOptions(dbPath) {
  const options = { mode: dbModule.DatabaseMode.WRITE_ENABLED };
  if (arguments.length > 0) options.dbPath = dbPath;
  return options;
}

function codeOf(fn) {
  try {
    fn();
    return null;
  } catch (err) {
    return err && err.code ? err.code : err && err.message;
  }
}

function enableSales() {
  process.env.BUZZARD_SALES_ENABLED = "1";
  process.env.BUZZARD_SALES_GATE_BYPASS = "1";
}

function closeSales() {
  delete process.env.BUZZARD_SALES_ENABLED;
}

afterAll(() => {
  if (previousSales === undefined) delete process.env.BUZZARD_SALES_ENABLED;
  else process.env.BUZZARD_SALES_ENABLED = previousSales;
  if (previousBypass === undefined) delete process.env.BUZZARD_SALES_GATE_BYPASS;
  else process.env.BUZZARD_SALES_GATE_BYPASS = previousBypass;
  if (previousDbPath === undefined) delete process.env.BUZZARD_DB_PATH;
  else process.env.BUZZARD_DB_PATH = previousDbPath;
  if (previousE2e === undefined) delete process.env.BUZZARD_E2E_DB;
  else process.env.BUZZARD_E2E_DB = previousE2e;
  if (realSqlite) serverRequire.cache[sqliteId] = realSqlite;
  else delete serverRequire.cache[sqliteId];
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("db module safe initialization", () => {
  it("does not construct SQLite or execute SQL when the module is imported", () => {
    expect(opens).toEqual([]);
    expect(sql).toEqual([]);
    expect(db.name).toBeNull();
    expect(db.open).toBe(false);
    expect(dbModule.dbPath).toBeNull();
    expect(dbModule.getDatabaseHealth().code).toBe("DATABASE_NOT_INITIALIZED");
    expect(codeOf(() => db.prepare("SELECT 1"))).toBe("DATABASE_NOT_INITIALIZED");
    expect(codeOf(() => db.exec("SELECT 1"))).toBe("DATABASE_NOT_INITIALIZED");
    expect(opens).toEqual([]);
    expect(sql).toEqual([]);
  });

  it("refuses initialization while sales are closed", () => {
    closeSales();
    expect(codeOf(() => dbModule.initializeDatabase({ dbPath: approvedA, mode: "WRITE_ENABLED" }))).toBe("DATABASE_MODE_REFUSED");
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions(approvedA)))).toBe("SALES_CLOSED");
    expect(opens).toEqual([]);
    expect(sql).toEqual([]);
    expect(fs.existsSync(approvedA)).toBe(false);
  });

  it("refuses protected paths before SQLite construction", () => {
    enableSales();
    const nested = path.join(dir, "server", "data");
    fs.mkdirSync(nested, { recursive: true });
    const refused = [
      commerceDb,
      workspaceDb,
      path.join(repoRoot, "server/data/other.sqlite"),
      path.join(dir, "buzzard.db"),
      path.join(dir, "buzzard_guardian.sqlite"),
      path.join(dir, "buzzard_guardian_copy.db"),
      path.join(nested, "synthetic.sqlite"),
      "",
      null,
      path.join(dir, "missing-parent", "synthetic.sqlite"),
      dir,
    ];
    for (const candidate of refused) {
      expect(codeOf(() => dbModule.initializeDatabase(writeOptions(candidate)))).toBe("DATA_PATH_REFUSED");
    }
    delete process.env.BUZZARD_DB_PATH;
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions()))).toBe("DATA_PATH_REFUSED");
    expect(opens).toEqual([]);
    expect(sql).toEqual([]);
  });

  it("refuses a symlink whose target is the protected commerce database", () => {
    enableSales();
    const link = path.join(dir, "commerce-link.sqlite");
    fs.symlinkSync(commerceDb, link);
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions(link)))).toBe("DATA_PATH_REFUSED");
    expect(opens).toEqual([]);
  });

  it("refuses a broken symlink", () => {
    enableSales();
    const link = path.join(dir, "broken-link.sqlite");
    fs.symlinkSync(path.join(dir, "does-not-exist.sqlite"), link);
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions(link)))).toBe("DATA_PATH_REFUSED");
    expect(opens).toEqual([]);
  });

  it("initializes only an approved synthetic path", () => {
    enableSales();
    const opened = dbModule.initializeDatabase(writeOptions(approvedA));
    expect(opened.ok).toBe(true);
    expect(opened.mode).toBe("WRITE_ENABLED");
    expect(opened.path).toBe(path.resolve(approvedA));
    expect(opens).toEqual([path.resolve(approvedA)]);
    expect(sql.length).toBeGreaterThan(0);
    expect(sql.every((entry) => entry[1] === path.resolve(approvedA))).toBe(true);
    expect(dbModule.dbPath).toBe(path.resolve(approvedA));
    const again = dbModule.initializeDatabase(writeOptions(approvedA));
    expect(again.reused).toBe(true);
    expect(opens).toHaveLength(1);
  });

  it("drops the previous handle when a later path is refused", () => {
    enableSales();
    const before = opens.length;
    const beforeSql = sql.length;
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions(commerceDb)))).toBe("DATA_PATH_REFUSED");
    expect(opens).toHaveLength(before);
    expect(sql).toHaveLength(beforeSql);
    expect(codeOf(() => db.prepare("SELECT 1"))).toBe("DATABASE_NOT_INITIALIZED");
    expect(sql).toHaveLength(beforeSql);
    expect(dbModule.dbPath).toBeNull();
    delete process.env.BUZZARD_DB_PATH;
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions()))).toBe("DATA_PATH_REFUSED");
    expect(opens).toHaveLength(before);
    expect(fs.readdirSync(dir).some((name) => name === "buzzard.db")).toBe(false);
  });

  it("does not reopen a database after sales close", () => {
    enableSales();
    dbModule.initializeDatabase(writeOptions(approvedB));
    expect(opens).toEqual([path.resolve(approvedA), path.resolve(approvedB)]);
    const before = opens.length;
    closeSales();
    expect(codeOf(() => dbModule.initializeDatabase(writeOptions(approvedB)))).toBe("SALES_CLOSED");
    expect(opens).toHaveLength(before);
    expect(codeOf(() => db.exec("SELECT 1"))).toBe("DATABASE_NOT_INITIALIZED");
    expect(dbModule.getDatabaseHealth()).toMatchObject({
      enabled: false,
      opened: false,
      path: null,
      code: "DATABASE_NOT_INITIALIZED",
      productionReady: false,
    });
  });

  it("leaves the protected commerce database untouched", () => {
    expect(fileMark(commerceDb)).toEqual(dbBefore);
    expect(fileMark(workspaceDb)).toEqual(workspaceBefore);
    expect(fileMark(ordersPath)).toEqual(ordersBefore);
    expect(opens.every((opened) => !String(opened).includes(`${path.sep}server${path.sep}data${path.sep}`))).toBe(true);
    expect(opens.every((opened) => path.basename(opened) !== "buzzard.db")).toBe(true);
  });
});
