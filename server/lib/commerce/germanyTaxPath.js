/**
 * Germany tax path. Separate from the 26-country pool. No ELSTER live filing.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { assertNotGuardian } = require("../pusat/durableTaskQueue");
const { estimateVat } = require("./ab27Tax");
const { roundMoney } = require("./commerceValidation");
const { POOL_COUNTRIES } = require("./taxPools");

function loadSqlite() {
  const root = path.join(__dirname, "..", "..", "..");
  try {
    return createRequire(path.join(root, "server", "package.json"))("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function createGermanyTaxStore({ dbPath } = {}) {
  const resolved = dbPath || path.join(os.tmpdir(), `buzzard-de-tax-${crypto.randomBytes(4).toString("hex")}.sqlite`);
  assertNotGuardian(resolved);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const Database = loadSqlite();
  const db = new Database(resolved);
  db.pragma("busy_timeout = 8000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS germany_tax_entries (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,
      net REAL NOT NULL,
      vat_estimate REAL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return { db, dbPath: resolved };
}

function postGermanyNet(store, { netIncome = 0, period = "2026-Q4" } = {}) {
  if (POOL_COUNTRIES.includes("DE")) {
    return { ok: false, code: "DE_MUST_NOT_BE_IN_26_POOL" };
  }
  const vat = estimateVat({ country: "DE", netAmount: netIncome });
  const id = `de-tax-${crypto.randomBytes(5).toString("hex")}`;
  const payload = {
    id,
    country: "DE",
    period,
    net: roundMoney(Math.max(0, Number(netIncome) || 0)),
    vatEstimate: vat.ok ? vat.vat : null,
    vatRate: vat.ok ? vat.rate : null,
    status: "UNVERIFIED",
    pool: false,
    emergencyReserveAppliedAsTax: false,
    elsterLive: false,
    filing: "WAITING_HUMAN",
    paymentAuthority: false,
  };
  store.db
    .prepare(
      `INSERT INTO germany_tax_entries(id, period, net, vat_estimate, status, payload_json, created_at)
       VALUES (?,?,?,?,?,?,?)`
    )
    .run(id, period, payload.net, payload.vatEstimate, payload.status, JSON.stringify(payload), new Date().toISOString());
  return { ok: true, ...payload, dbPath: store.dbPath };
}

function submitElster() {
  return {
    ok: false,
    code: "ELSTER_BLOCKED",
    live: false,
    elsterLive: false,
    note: "Germany filing stays human-gated. No ELSTER connection.",
  };
}

function listGermanyEntries(store) {
  return store.db.prepare(`SELECT * FROM germany_tax_entries ORDER BY created_at`).all().map((row) => ({
    ...row,
    payload: JSON.parse(row.payload_json),
  }));
}

module.exports = {
  createGermanyTaxStore,
  postGermanyNet,
  submitElster,
  listGermanyEntries,
};
