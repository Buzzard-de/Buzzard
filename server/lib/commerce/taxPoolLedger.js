/**
 * Isolated persist for the 26 non-DE tax pools. No payment authority.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");
const { postNetIncome, payTax, POOL_COUNTRIES, snapshot } = require("./taxPools");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function createTaxPoolStore({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), `buzzard-tax-pool-${crypto.randomBytes(4).toString("hex")}.sqlite`);
  assertNotGuardian(resolved);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tax_pool_entries (
      id TEXT PRIMARY KEY,
      country TEXT NOT NULL,
      net REAL NOT NULL,
      reserve REAL NOT NULL,
      period TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return { db, dbPath: resolved };
}

function postPoolIncome(store, input = {}) {
  const posted = postNetIncome(input);
  if (!posted.ok) return posted;
  const id = `pool-${crypto.randomBytes(5).toString("hex")}`;
  store.db
    .prepare(
      `INSERT INTO tax_pool_entries(id, country, net, reserve, period, payload_json, created_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(
      id,
      posted.entry.country,
      posted.entry.net,
      posted.entry.reserve,
      posted.period,
      JSON.stringify({ ...posted, id, paymentAuthority: false }),
      new Date().toISOString()
    );
  return { ...posted, id, persisted: true, dbPath: store.dbPath, paymentAuthority: false };
}

function listPoolEntries(store) {
  return store.db.prepare(`SELECT * FROM tax_pool_entries ORDER BY created_at`).all().map((row) => ({
    ...row,
    payload: JSON.parse(row.payload_json),
  }));
}

function reopenTaxPoolStore({ dbPath } = {}) {
  return createTaxPoolStore({ dbPath });
}

module.exports = {
  POOL_COUNTRIES,
  createTaxPoolStore,
  postPoolIncome,
  listPoolEntries,
  reopenTaxPoolStore,
  payTax,
  snapshot,
};
