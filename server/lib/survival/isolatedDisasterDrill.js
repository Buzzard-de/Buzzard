/**
 * Isolated disaster drill. Synthetic SQLite only. Never touches /var/data or live buzzard.db.
 * Result is ISOLATED_RESTORE_TESTED, never PRODUCTION_DR_VERIFIED.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");
const { createCopies } = require("./copies32110");
const { assertSafePath } = require("./proveBackupRestore");
const { postNetIncome, payTax, resetPools, RESERVE_RATE } = require("../commerce/taxPools");

const root = path.join(__dirname, "..", "..", "..");
const serverRequire = createRequire(path.join(root, "server", "package.json"));

function loadSqlite() {
  try {
    return serverRequire("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function seed(db) {
  db.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT, name TEXT, category TEXT);
    CREATE TABLE inventory (sku TEXT PRIMARY KEY, qty INTEGER);
    CREATE TABLE customers (id INTEGER PRIMARY KEY, email TEXT);
    CREATE TABLE suppliers (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, sku TEXT, qty INTEGER, status TEXT, paid INTEGER);
    CREATE TABLE order_events (id INTEGER PRIMARY KEY, order_id INTEGER, event TEXT);
    CREATE TABLE finance_journal (id INTEGER PRIMARY KEY, kind TEXT, amount REAL, note TEXT);
    CREATE TABLE pusat_tasks (id INTEGER PRIMARY KEY, title TEXT, owner TEXT, status TEXT);
    CREATE TABLE ai_memory (agent TEXT, key TEXT, value TEXT, PRIMARY KEY (agent, key));
    CREATE TABLE audit_log (id INTEGER PRIMARY KEY, event TEXT, at TEXT);
  `);
  db.prepare("INSERT INTO products (sku, name, category) VALUES (?, ?, ?)").run("SYN-1", "Synthetic Brake Pad", "cat-05");
  db.prepare("INSERT INTO inventory (sku, qty) VALUES (?, ?)").run("SYN-1", 10);
  db.prepare("INSERT INTO customers (email) VALUES (?)").run("synthetic@example.invalid");
  db.prepare("INSERT INTO suppliers (name) VALUES (?)").run("Synthetic Supplier GmbH");
  db.prepare("INSERT INTO pusat_tasks (title, owner, status) VALUES (?, ?, ?)").run("drill", "pusat", "OPEN");
  db.prepare("INSERT INTO ai_memory (agent, key, value) VALUES (?, ?, ?)").run("dogu", "note", "unverified-research");
  db.prepare("INSERT INTO audit_log (event, at) VALUES (?, ?)").run("SEED", new Date().toISOString());
}

function runWorkflows(db) {
  db.prepare("INSERT INTO products (sku, name, category) VALUES (?, ?, ?)").run("SYN-2", "Synthetic Filter", "cat-05");
  const stock = db.prepare("SELECT qty FROM inventory WHERE sku = ?").get("SYN-1");
  const order = db.prepare("INSERT INTO orders (sku, qty, status, paid) VALUES (?, ?, ?, ?)").run("SYN-1", 1, "CREATED", 0);
  db.prepare("INSERT INTO order_events (order_id, event) VALUES (?, ?)").run(order.lastInsertRowid, "CREATED");
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run("CANCELLED", order.lastInsertRowid);
  db.prepare("INSERT INTO order_events (order_id, event) VALUES (?, ?)").run(order.lastInsertRowid, "CANCELLED");
  db.prepare("INSERT INTO finance_journal (kind, amount, note) VALUES (?, ?, ?)").run("RETURN_ACCRUAL", 0, "no-live-refund");
  const supplier = db.prepare("SELECT name FROM suppliers").get();
  resetPools();
  const posted = postNetIncome({ country: "FR", netIncome: 100 });
  const denied = payTax({ country: "FR", amount: 25 });
  const task = db.prepare("SELECT status FROM pusat_tasks WHERE owner = ?").get("pusat");
  const memory = db.prepare("SELECT value FROM ai_memory WHERE agent = ?").get("dogu");
  const audit = db.prepare("SELECT COUNT(*) AS n FROM audit_log").get();
  return {
    productCreated: Boolean(db.prepare("SELECT 1 FROM products WHERE sku = ?").get("SYN-2")),
    stockQty: stock?.qty,
    orderCancelled: db.prepare("SELECT status FROM orders WHERE id = ?").get(order.lastInsertRowid)?.status === "CANCELLED",
    paidFlag: db.prepare("SELECT paid FROM orders WHERE id = ?").get(order.lastInsertRowid)?.paid === 0,
    returnJournal: Boolean(db.prepare("SELECT 1 FROM finance_journal WHERE kind = ?").get("RETURN_ACCRUAL")),
    supplierName: supplier?.name || null,
    taxReserveRate: RESERVE_RATE,
    taxPosted: posted.ok === true && posted.entry.reserve === 25,
    taxPayDenied: denied.code === "PAYMENT_AUTHORITY_DENIED",
    pusatOpen: task?.status === "OPEN",
    aiMemoryRestored: memory?.value === "unverified-research",
    auditPresent: audit.n >= 1,
  };
}

function runIsolatedDisasterDrill() {
  const started = Date.now();
  const Database = loadSqlite();
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-dr-drill-"));
  assertSafePath(workRoot);
  const sourceDb = path.join(workRoot, "source.db");
  const restoreDb = path.join(workRoot, "restored.db");
  assertSafePath(sourceDb);
  assertSafePath(restoreDb);

  const source = new Database(sourceDb);
  seed(source);
  const integrityBefore = source.prepare("PRAGMA integrity_check").get();
  source.close();

  const copies = createCopies({
    sourcePath: sourceDb,
    workRoot: path.join(workRoot, "copies"),
    area: "databases",
    label: "isolated-drill",
  });
  const primary = copies.copies.find((c) => c.slot === "copy1-primary");
  fs.copyFileSync(primary.path, restoreDb);

  const restored = new Database(restoreDb);
  const integrityAfter = restored.prepare("PRAGMA integrity_check").get();
  const flows = runWorkflows(restored);
  restored.close();

  const ok =
    copies.ok &&
    integrityBefore?.integrity_check === "ok" &&
    integrityAfter?.integrity_check === "ok" &&
    flows.productCreated &&
    flows.stockQty === 10 &&
    flows.orderCancelled &&
    flows.paidFlag &&
    flows.taxPayDenied &&
    flows.taxPosted &&
    flows.aiMemoryRestored;

  return {
    status: ok ? "ISOLATED_RESTORE_TESTED" : "ISOLATED_RESTORE_FAILED",
    productionDrVerified: false,
    productionTouched: false,
    measuredMs: Date.now() - started,
    measuredNote: "Lab synthetic SQLite only. Not production RTO.",
    offsite: copies.offsite,
    worm: "BLOCKED",
    integrityBefore: integrityBefore?.integrity_check,
    integrityAfter: integrityAfter?.integrity_check,
    flows,
    workRoot,
  };
}

module.exports = { runIsolatedDisasterDrill };
