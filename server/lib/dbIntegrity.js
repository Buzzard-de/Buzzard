/**
 * Part 13 — SQLite integrity and schema availability checks
 */
const { db } = require("./db");

const CRITICAL_TABLES = [
  "users",
  "products",
  "core_ai_employees",
  "core_background_jobs",
  "core_worker_state",
  "core_integrations",
  "pim_core_products",
  "commerce_carts",
  "commerce_orders",
  "commerce_checkouts",
];

const CORE_PREFIX_TABLES = ["core_%"];
const PIM_PREFIX = "pim_core_%";
const COMMERCE_PREFIX = "commerce_%";

function tableExists(name) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
  return Boolean(row);
}

function countTablesLike(pattern) {
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?")
    .all(pattern);
  return rows.length;
}

function runIntegrityCheck() {
  let integrityResult = "unknown";
  try {
    const row = db.prepare("PRAGMA integrity_check").get();
    integrityResult = row?.integrity_check || "unknown";
  } catch (err) {
    integrityResult = `error:${err.message}`;
  }

  const tables = {};
  const missing = [];
  for (const name of CRITICAL_TABLES) {
    const present = tableExists(name);
    tables[name] = present ? "present" : "missing";
    if (!present) missing.push(name);
  }

  const schemaCounts = {
    coreTables: countTablesLike("core_%"),
    pimCoreTables: countTablesLike("pim_core_%"),
    commerceTables: countTablesLike("commerce_%"),
  };

  let status = "OK";
  if (integrityResult !== "ok") status = "FAILED";
  else if (missing.length > 0) status = "DEGRADED";

  return {
    status,
    integrityCheck: integrityResult,
    tables,
    missingCritical: missing,
    schemaCounts,
    migrationReady: missing.length === 0 && integrityResult === "ok",
  };
}

module.exports = {
  CRITICAL_TABLES,
  runIntegrityCheck,
  tableExists,
};
