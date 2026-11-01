/**
 * Prove backup → restore on TEMPORARY databases only.
 * Refuses production paths and /var/data.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { createCopies } = require("./copies32110");

const root = path.join(__dirname, "..", "..", "..");
const serverRequire = createRequire(path.join(root, "server", "package.json"));

function loadSqlite() {
  try {
    return serverRequire("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function assertSafePath(target) {
  const resolved = path.resolve(target);
  if (resolved.startsWith("/var/data") || process.env.NODE_ENV === "production") {
    const err = new Error("REFUSE_PRODUCTION_RESTORE");
    err.code = "REFUSE_PRODUCTION_RESTORE";
    throw err;
  }
  if (resolved.includes(`${path.sep}server${path.sep}data${path.sep}buzzard.db`)) {
    const err = new Error("REFUSE_LIVE_DB");
    err.code = "REFUSE_LIVE_DB";
    throw err;
  }
  return resolved;
}

function proveRestore({ workRoot } = {}) {
  const Database = loadSqlite();
  const rootDir = workRoot || fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-32110-"));
  assertSafePath(rootDir);

  const sourceDb = path.join(rootDir, "source.db");
  const restoreDb = path.join(rootDir, "restored.db");
  assertSafePath(sourceDb);
  assertSafePath(restoreDb);

  const marker = `marker-${Date.now()}`;
  const db = new Database(sourceDb);
  db.exec("CREATE TABLE survival_probe (id INTEGER PRIMARY KEY, marker TEXT NOT NULL, created_at TEXT NOT NULL)");
  db.prepare("INSERT INTO survival_probe (marker, created_at) VALUES (?, ?)").run(marker, new Date().toISOString());
  const integrity = db.prepare("PRAGMA integrity_check").get();
  db.close();

  const copies = createCopies({
    sourcePath: sourceDb,
    workRoot: path.join(rootDir, "copies"),
    area: "databases",
    label: "prove",
  });

  const primary = copies.copies.find((c) => c.slot === "copy1-primary");
  fs.copyFileSync(primary.path, restoreDb);

  const restored = new Database(restoreDb, { readonly: true });
  const row = restored.prepare("SELECT marker FROM survival_probe").get();
  const restoredIntegrity = restored.prepare("PRAGMA integrity_check").get();
  restored.close();

  const consistent = row?.marker === marker && restoredIntegrity?.integrity_check === "ok";

  return {
    ok: copies.ok && consistent && integrity?.integrity_check === "ok",
    marker,
    restoredMarker: row?.marker || null,
    consistent,
    copies,
    workRoot: rootDir,
    productionTouched: false,
  };
}

module.exports = {
  assertSafePath,
  proveRestore,
};
