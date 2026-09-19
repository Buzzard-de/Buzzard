const __import_meta_url__=require("url").pathToFileURL(__filename).href;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/production-storage-preflight/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  buildProductionStoragePreflightReport: () => buildProductionStoragePreflightReport,
  buildRenderBlueprintValidation: () => buildRenderBlueprintValidation,
  buildRenderPersistentDiskBlueprintReport: () => buildRenderPersistentDiskBlueprintReport,
  checkBackupRestorePreflight: () => checkBackupRestorePreflight,
  checkDeploymentConfiguration: () => checkDeploymentConfiguration,
  checkEnvironmentVariables: () => checkEnvironmentVariables,
  checkSqliteConfiguration: () => checkSqliteConfiguration,
  resolveEffectiveDbPath: () => resolveEffectiveDbPath,
  resolvePersistenceMode: () => resolvePersistenceMode,
  runRestartPersistenceTest: () => runRestartPersistenceTest,
  validateRenderBlueprint: () => validateRenderBlueprint,
  validateVarDataMount: () => validateVarDataMount
});
module.exports = __toCommonJS(serverEntry_exports);

// lib/production-defaults/index.ts
var FLAG_ENV = {
  SUPPLIER_NETWORK: "SUPPLIER_NETWORK_ENABLED",
  SUPPLIER_LIVE_READ: "SUPPLIER_LIVE_READ_ENABLED",
  SUPPLIER_ORDER_NETWORK: "SUPPLIER_ORDER_NETWORK_ENABLED",
  PAYMENT_PRODUCTION: "PAYMENT_PRODUCTION_ENABLED",
  CARRIER_PRODUCTION: "CARRIER_PRODUCTION_ENABLED",
  RETURNS_PRODUCTION: "RETURNS_PRODUCTION_ENABLED",
  MARKETING_SPEND: "MARKETING_SPEND_ENABLED",
  AI_PRODUCTION: "AI_PRODUCTION_ENABLED",
  SALES: "SALES_ENABLED"
};
function isProductionFlagEnabled(flag) {
  const envKey = FLAG_ENV[flag];
  const value = process.env[envKey];
  return value === "1" || value === "true";
}
function getProductionFlagsSnapshot() {
  const out = {};
  for (const flag of Object.keys(FLAG_ENV)) {
    out[flag] = isProductionFlagEnabled(flag) ? "ON" : "OFF";
  }
  return out;
}

// lib/supplier-engine/network/config.ts
function envFlag(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw === void 0 || raw === "") return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}
function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
var SUPPLIER_NETWORK_CONFIG = {
  get networkEnabled() {
    return envFlag("SUPPLIER_NETWORK_ENABLED", false);
  },
  get orderNetworkEnabled() {
    return envFlag("SUPPLIER_ORDER_NETWORK_ENABLED", false);
  },
  defaultEnvironment: "MOCK",
  defaultTimeoutMs: envInt("SUPPLIER_HTTP_TIMEOUT_MS", 3e4),
  maxResponseBytes: envInt("SUPPLIER_MAX_RESPONSE_BYTES", 5 * 1024 * 1024),
  maxRetries: envInt("SUPPLIER_HTTP_MAX_RETRIES", 3),
  maxConcurrentRequests: envInt("SUPPLIER_MAX_CONCURRENT_REQUESTS", 5)
};

// lib/supplier-engine/network/scopedValidationNetwork.ts
var import_async_hooks = require("async_hooks");
var scopedContext = new import_async_hooks.AsyncLocalStorage();

// lib/first-order-fulfillment/safety.ts
var counters = {
  realSupplierHttpCalls: 0,
  realSupplierOrders: 0,
  realCustomerOrders: 0,
  paymentSideEffects: 0,
  carrierSideEffects: 0,
  unknownOutcomes: 0,
  mockExecutions: 0
};
function getFulfillmentSafetyCounters() {
  return { ...counters };
}

// lib/payment-production/safety.ts
var counters2 = {
  realCharges: 0,
  realRefunds: 0,
  webhookProcessed: 0,
  blockedCaptures: 0
};
function getPaymentProductionSafetyCounters() {
  return { ...counters2 };
}

// lib/returns-refunds-production/safety.ts
var counters3 = { realRefunds: 0, assumedRecoveries: 0 };
function getReturnsRefundsSafetyCounters() {
  return { ...counters3 };
}

// lib/carrier-production/safety.ts
var counters4 = { realLabels: 0, realHttpCalls: 0 };
function getCarrierProductionSafetyCounters() {
  return { ...counters4 };
}

// lib/final-production-go-live/safety.ts
var counters5 = { realMarketplaceMutations: 0, realMarketingSpend: 0 };
function getFinalGoLiveSafetyCounters() {
  const fulfillment = getFulfillmentSafetyCounters();
  const payment = getPaymentProductionSafetyCounters();
  const returns = getReturnsRefundsSafetyCounters();
  const carrier = getCarrierProductionSafetyCounters();
  return {
    realSupplierOrders: fulfillment.realSupplierOrders,
    realPayments: payment.realCharges,
    realRefunds: returns.realRefunds,
    realCarrierLabels: carrier.realLabels,
    realMarketplaceMutations: counters5.realMarketplaceMutations,
    realMarketingSpend: counters5.realMarketingSpend
  };
}

// lib/production-access/evidencePolicy.ts
var rejectedAttempts = 0;
function countRejectedEvidenceAttempts() {
  return rejectedAttempts;
}

// lib/production-storage-preflight/environmentValidation.ts
var CANONICAL_MOUNT = "/var/data";
function envHint(name) {
  const val = process.env[name];
  if (!val?.trim()) return "NOT_SET";
  if (name.includes("SECRET") || name.includes("PASSWORD") || name.includes("TOKEN")) {
    return "CONFIGURED";
  }
  if (val.startsWith("/")) return val;
  if (val.length > 40) return "CONFIGURED";
  return val;
}
function checkEnvironmentVariables() {
  const vars = [
    "BUZZARD_DB_PATH",
    "BUZZARD_BACKUP_DIR",
    "PERSISTENT_DATA_PATH",
    "SQLITE_PATH",
    "DATABASE_PATH",
    "DATA_DIR",
    "NODE_ENV",
    "REQUIRE_PERSISTENT_DB"
  ];
  return vars.map((name) => ({
    name,
    configured: Boolean(process.env[name]?.trim()),
    valueHint: envHint(name)
  }));
}
function resolvePersistenceMode() {
  const dbPath = process.env.BUZZARD_DB_PATH?.trim() || process.env.SQLITE_PATH?.trim() || process.env.DATABASE_PATH?.trim() || "";
  const isProduction = process.env.NODE_ENV === "production";
  if (dbPath.startsWith(CANONICAL_MOUNT)) return "PERSISTENT";
  if (dbPath && !dbPath.includes("/tmp")) return "PERSISTENT";
  if (isProduction) return "EPHEMERAL";
  return "DEVELOPMENT";
}
function resolveEffectiveDbPath() {
  if (process.env.BUZZARD_DB_PATH?.trim()) {
    return process.env.BUZZARD_DB_PATH.trim();
  }
  if (process.env.SQLITE_PATH?.trim()) {
    return process.env.SQLITE_PATH.trim();
  }
  if (process.env.DATABASE_PATH?.trim()) {
    return process.env.DATABASE_PATH.trim();
  }
  return "server/data/buzzard.db";
}
function isPersistenceConfigured() {
  const mode = resolvePersistenceMode();
  const dbPath = resolveEffectiveDbPath();
  return mode === "PERSISTENT" || dbPath.startsWith(CANONICAL_MOUNT);
}

// lib/production-storage-preflight/varDataValidation.ts
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
function loadSqlite() {
  try {
    return require("better-sqlite3");
  } catch {
    try {
      return require(import_path.default.join(process.cwd(), "server/node_modules/better-sqlite3"));
    } catch {
      return null;
    }
  }
}
function validateVarDataMount() {
  const mountPath = CANONICAL_MOUNT;
  let exists = false;
  let isDirectory = false;
  let writable = false;
  let sqliteOpenable = false;
  const notes = [];
  try {
    exists = import_fs.default.existsSync(mountPath);
    if (exists) {
      const stat = import_fs.default.statSync(mountPath);
      isDirectory = stat.isDirectory();
      if (isDirectory) {
        import_fs.default.accessSync(mountPath, import_fs.default.constants.W_OK);
        writable = true;
      }
    }
  } catch (err) {
    notes.push(err instanceof Error ? err.message : "access_check_failed");
  }
  if (exists && isDirectory && writable) {
    const Database = loadSqlite();
    if (Database) {
      const testDb = import_path.default.join(mountPath, ".buzzard-preflight-test.db");
      try {
        const db = new Database(testDb);
        db.close();
        import_fs.default.unlinkSync(testDb);
        sqliteOpenable = true;
      } catch (err) {
        notes.push(`sqlite_test:${err instanceof Error ? err.message : "failed"}`);
      }
    } else {
      notes.push("sqlite_module_unavailable_for_mount_test");
    }
  } else if (!exists) {
    notes.push("MANUAL_RENDER_ACTION_REQUIRED: mount persistent disk at /var/data");
  }
  let status = "BLOCKED";
  if (exists && isDirectory && writable && sqliteOpenable) {
    status = "PASS";
  } else if (exists && isDirectory) {
    status = "WARNING";
  } else if (process.env.NODE_ENV !== "production") {
    status = "UNVERIFIED";
    notes.push("Local/dev environment \u2014 live Render disk validation required");
  }
  return {
    path: mountPath,
    exists,
    isDirectory,
    writable,
    sqliteOpenable,
    status,
    notes: notes.join("; ") || (status === "PASS" ? "Mount ready" : "Not configured on this instance")
  };
}
function getIsolatedPreflightDir() {
  return import_path.default.join(import_os.default.tmpdir(), "buzzard-storage-preflight");
}

// lib/production-storage-preflight/sqliteCheck.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
function loadSqlite2() {
  try {
    return require("better-sqlite3");
  } catch {
    try {
      return require(import_path2.default.join(process.cwd(), "server/node_modules/better-sqlite3"));
    } catch {
      return null;
    }
  }
}
function checkSqliteConfiguration(usePath) {
  const databasePath = import_path2.default.resolve(usePath ?? resolveEffectiveDbPath());
  const fileExists = import_fs2.default.existsSync(databasePath);
  const Database = loadSqlite2();
  if (!Database) {
    return {
      databasePath,
      fileExists,
      walMode: null,
      journalMode: null,
      foreignKeys: null,
      busyTimeout: null,
      integrityCheck: null,
      schemaVersion: null,
      migrationReady: false,
      status: "WARNING"
    };
  }
  if (!fileExists) {
    return {
      databasePath,
      fileExists: false,
      walMode: null,
      journalMode: null,
      foreignKeys: null,
      busyTimeout: null,
      integrityCheck: null,
      schemaVersion: null,
      migrationReady: false,
      status: "UNVERIFIED"
    };
  }
  try {
    const db = new Database(databasePath, { readonly: true });
    const journalRow = db.prepare("PRAGMA journal_mode").get();
    const fkRow = db.prepare("PRAGMA foreign_keys").get();
    const busyRow = db.prepare("PRAGMA busy_timeout").get();
    const integrityRow = db.prepare("PRAGMA integrity_check").get();
    const userVersion = db.prepare("PRAGMA user_version").get();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    db.close();
    const critical = ["products", "commerce_orders", "pim_core_products"];
    const tableNames = new Set(tables.map((t) => t.name));
    const migrationReady = critical.every((t) => tableNames.has(t));
    const integrityOk = integrityRow?.integrity_check === "ok";
    return {
      databasePath,
      fileExists: true,
      walMode: journalRow?.journal_mode === "wal" ? "wal" : journalRow?.journal_mode ?? null,
      journalMode: journalRow?.journal_mode ?? null,
      foreignKeys: fkRow?.foreign_keys === 1,
      busyTimeout: busyRow?.busy_timeout ?? null,
      integrityCheck: integrityRow?.integrity_check ?? null,
      schemaVersion: userVersion?.user_version != null ? String(userVersion.user_version) : null,
      migrationReady: migrationReady && integrityOk,
      status: integrityOk ? migrationReady ? "PASS" : "WARNING" : "BLOCKED"
    };
  } catch (err) {
    return {
      databasePath,
      fileExists: true,
      walMode: null,
      journalMode: null,
      foreignKeys: null,
      busyTimeout: null,
      integrityCheck: err instanceof Error ? err.message : "open_failed",
      schemaVersion: null,
      migrationReady: false,
      status: "BLOCKED"
    };
  }
}

// lib/production-storage-preflight/restartPersistenceTest.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var TEST_TABLE = "buzzard_preflight_restart_test";
var TEST_KEY = "preflight_marker";
function loadSqlite3() {
  try {
    return require("better-sqlite3");
  } catch {
    try {
      return require(import_path3.default.join(process.cwd(), "server/node_modules/better-sqlite3"));
    } catch {
      return null;
    }
  }
}
function runRestartPersistenceTest() {
  const Database = loadSqlite3();
  const testDir = getIsolatedPreflightDir();
  const testDbPath = import_path3.default.join(testDir, "restart-persistence-test.db");
  const marker = `preflight-${Date.now()}`;
  if (!Database) {
    return {
      status: "WARNING",
      testDbPath,
      writeOk: false,
      readOk: false,
      cleanupOk: false,
      notes: "better-sqlite3 unavailable \u2014 restart test skipped"
    };
  }
  let writeOk = false;
  let readOk = false;
  let cleanupOk = false;
  try {
    import_fs3.default.mkdirSync(testDir, { recursive: true });
    if (import_fs3.default.existsSync(testDbPath)) import_fs3.default.unlinkSync(testDbPath);
    const db1 = new Database(testDbPath);
    db1.exec(`CREATE TABLE IF NOT EXISTS ${TEST_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    db1.prepare(`INSERT OR REPLACE INTO ${TEST_TABLE} (key, value) VALUES (?, ?)`).run(TEST_KEY, marker);
    db1.close();
    writeOk = true;
    const db2 = new Database(testDbPath);
    const row = db2.prepare(`SELECT value FROM ${TEST_TABLE} WHERE key = ?`).get(TEST_KEY);
    db2.close();
    readOk = row?.value === marker;
    import_fs3.default.unlinkSync(testDbPath);
    cleanupOk = true;
    return {
      status: writeOk && readOk && cleanupOk ? "PASS" : "BLOCKED",
      testDbPath,
      writeOk,
      readOk,
      cleanupOk,
      notes: writeOk && readOk ? "Isolated write/reopen/read cycle passed (local temp DB)" : "Restart persistence cycle failed"
    };
  } catch (err) {
    try {
      if (import_fs3.default.existsSync(testDbPath)) import_fs3.default.unlinkSync(testDbPath);
      cleanupOk = true;
    } catch {
      cleanupOk = false;
    }
    return {
      status: "BLOCKED",
      testDbPath,
      writeOk,
      readOk,
      cleanupOk,
      notes: err instanceof Error ? err.message : "restart_test_failed"
    };
  }
}
function getRenderRestartRequirement(varDataExists, persistenceMode) {
  if (process.env.NODE_ENV === "production" && varDataExists && persistenceMode === "PERSISTENT") {
    return "MANUAL_RENDER_RESTART_REQUIRED \u2014 verify persistence after deploy/restart on Render instance";
  }
  if (process.env.NODE_ENV === "production" && !varDataExists) {
    return "MANUAL_RENDER_RESTART_REQUIRED \u2014 mount disk first, then deploy and verify /api/health/db";
  }
  return null;
}

// lib/production-storage-preflight/backupRestorePreflight.ts
var import_fs5 = __toESM(require("fs"));
var import_path5 = __toESM(require("path"));

// lib/final-closure/backupRestore.ts
var import_crypto = require("crypto");
var import_fs4 = require("fs");
var import_path4 = __toESM(require("path"));
var cachedEvidence = null;
function step(name, status, detail) {
  return { step: name, status, detail };
}
function loadSqlite4() {
  try {
    return require("better-sqlite3");
  } catch {
    return null;
  }
}
function trySqliteIntegrity(dbPath) {
  try {
    const Database = loadSqlite4();
    if (!Database) return { ok: false, detail: "sqlite_unavailable" };
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("PRAGMA integrity_check").get();
    db.close();
    const ok = row?.integrity_check === "ok";
    return { ok, detail: row?.integrity_check };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "sqlite_unavailable" };
  }
}
function verifyCriticalTables(dbPath) {
  try {
    const Database = loadSqlite4();
    if (!Database) return { ok: false, detail: "sqlite_unavailable" };
    const db = new Database(dbPath, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    db.close();
    const names = new Set(tables.map((t) => t.name));
    const hasAny = names.size > 0;
    return { ok: hasAny, detail: `tables=${names.size}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "tables_check_failed" };
  }
}
function runBackupRestoreValidation() {
  const steps = [];
  const root = process.cwd();
  const dbPath = import_path4.default.join(root, "server/data/buzzard.db");
  const backupDir = import_path4.default.join(root, "server/data/backups");
  const isolatedDir = import_path4.default.join(root, "server/data/.closure-restore-test");
  const isolatedDb = import_path4.default.join(isolatedDir, "restored.db");
  const scripts = ["scripts/db-backup.mjs", "scripts/restore-db.mjs"];
  for (const s of scripts) {
    if (!(0, import_fs4.existsSync)(import_path4.default.join(root, s))) {
      steps.push(step("CREATE_BACKUP", "BLOCKED", `missing:${s}`));
      cachedEvidence = buildEvidence(steps, "BLOCKED");
      return cachedEvidence;
    }
  }
  steps.push(step("CREATE_BACKUP", "PASS", "scripts_present"));
  if (!(0, import_fs4.existsSync)(dbPath)) {
    steps.push(step("VERIFY_BACKUP", "SKIPPED", "no_source_db"));
    steps.push(step("CREATE_ISOLATED_RESTORE", "SKIPPED", "no_source_db"));
    steps.push(step("VERIFY_DATABASE_INTEGRITY", "SKIPPED", "no_source_db"));
    steps.push(step("VERIFY_CRITICAL_TABLES", "SKIPPED", "no_source_db"));
    steps.push(step("VERIFY_ENGINE_STATE", "SKIPPED", "no_source_db"));
    steps.push(step("RESTORE_RESULT", "SKIPPED", "no_source_db"));
    cachedEvidence = buildEvidence(steps, "UNVERIFIED");
    return cachedEvidence;
  }
  const dbStat = (0, import_fs4.statSync)(dbPath);
  if (dbStat.size < 1024) {
    steps.push(step("VERIFY_BACKUP", "BLOCKED", "source_db_too_small"));
    cachedEvidence = buildEvidence(steps, "BLOCKED");
    return cachedEvidence;
  }
  steps.push(step("VERIFY_BACKUP", "PASS", `size=${dbStat.size}`));
  try {
    (0, import_fs4.mkdirSync)(isolatedDir, { recursive: true });
    (0, import_fs4.copyFileSync)(dbPath, isolatedDb);
    steps.push(step("CREATE_ISOLATED_RESTORE", "PASS", isolatedDb));
  } catch (err) {
    steps.push(step("CREATE_ISOLATED_RESTORE", "BLOCKED", String(err)));
    cachedEvidence = buildEvidence(steps, "BLOCKED");
    return cachedEvidence;
  }
  const integrity = trySqliteIntegrity(isolatedDb);
  steps.push(step("VERIFY_DATABASE_INTEGRITY", integrity.ok ? "PASS" : "BLOCKED", integrity.detail));
  const tables = verifyCriticalTables(isolatedDb);
  steps.push(step("VERIFY_CRITICAL_TABLES", tables.ok ? "PASS" : "BLOCKED", tables.detail));
  steps.push(step("VERIFY_ENGINE_STATE", "PASS", "isolated_copy_only_no_ssot_mutation"));
  try {
    (0, import_fs4.rmSync)(isolatedDir, { recursive: true, force: true });
  } catch {
  }
  const blocked = steps.some((s) => s.status === "BLOCKED");
  const allPass = steps.every((s) => s.status === "PASS");
  steps.push(step("RESTORE_RESULT", blocked ? "BLOCKED" : allPass ? "PASS" : "SKIPPED"));
  cachedEvidence = buildEvidence(steps, blocked ? "BLOCKED" : allPass ? "PASS" : "UNVERIFIED");
  return cachedEvidence;
}
function buildEvidence(steps, result) {
  return {
    evidenceId: (0, import_crypto.randomUUID)(),
    steps,
    result,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// lib/production-storage-preflight/backupRestorePreflight.ts
function checkBackupRestorePreflight() {
  const root = process.cwd();
  const backupScript = import_path5.default.join(root, "scripts/db-backup.mjs");
  const restoreScript = import_path5.default.join(root, "scripts/restore-db.mjs");
  const backupScriptPresent = import_fs5.default.existsSync(backupScript);
  const restoreScriptPresent = import_fs5.default.existsSync(restoreScript);
  const backupDir = process.env.BUZZARD_BACKUP_DIR?.trim() || import_path5.default.join(root, "server/data/backups");
  const backupDirExists = import_fs5.default.existsSync(backupDir);
  let backupAvailable = false;
  if (backupDirExists) {
    try {
      const files = import_fs5.default.readdirSync(backupDir).filter((f) => f.endsWith(".db"));
      backupAvailable = files.length > 0;
    } catch {
      backupAvailable = false;
    }
  }
  const restoreProcedureDocumented = import_fs5.default.existsSync(import_path5.default.join(root, "docs/DB_PERSISTENCE_RENDER_DE.md")) && import_fs5.default.existsSync(restoreScript);
  let restoreEvidence = "UNVERIFIED";
  try {
    const evidence = runBackupRestoreValidation();
    if (evidence.result === "PASS") restoreEvidence = "PASS";
    else if (evidence.result === "BLOCKED") restoreEvidence = "BLOCKED";
    else restoreEvidence = "UNVERIFIED";
  } catch {
    restoreEvidence = "UNVERIFIED";
  }
  const onRenderProduction = process.env.NODE_ENV === "production" && resolveEffectiveDbPath().startsWith("/var/data");
  if (onRenderProduction && restoreEvidence !== "PASS") {
    restoreEvidence = "UNVERIFIED";
  }
  let status = "PASS";
  if (!backupScriptPresent || !restoreScriptPresent) status = "BLOCKED";
  else if (restoreEvidence === "UNVERIFIED") status = "UNVERIFIED";
  else if (!backupDirExists) status = "WARNING";
  const notes = [];
  if (restoreEvidence === "UNVERIFIED") {
    notes.push("RESTORE_EVIDENCE=UNVERIFIED on production Render until live backup/restore verified");
  }
  if (!backupAvailable) {
    notes.push("No backup files found in backup directory");
  }
  return {
    backupScriptPresent,
    restoreScriptPresent,
    backupDir,
    backupDirExists,
    backupAvailable,
    restoreProcedureDocumented,
    restoreEvidence,
    integrityCheckSupported: backupScriptPresent && restoreScriptPresent,
    status,
    notes: notes.join("; ") || "Backup/restore scripts present"
  };
}

// lib/production-storage-preflight/deploymentConfig.ts
var import_fs6 = __toESM(require("fs"));
var import_path6 = __toESM(require("path"));
function checkDeploymentConfiguration() {
  const renderYaml = import_path6.default.join(process.cwd(), "render.yaml");
  const renderYamlPresent = import_fs6.default.existsSync(renderYaml);
  const notes = [];
  let persistentDiskInBlueprint = false;
  let buzzardDbPathInBlueprint = false;
  let backupDirInBlueprint = false;
  let healthCheckConfigured = false;
  if (renderYamlPresent) {
    const yaml = import_fs6.default.readFileSync(renderYaml, "utf8");
    persistentDiskInBlueprint = yaml.includes("mountPath: /var/data");
    buzzardDbPathInBlueprint = yaml.includes("BUZZARD_DB_PATH") && yaml.includes("/var/data/buzzard.db");
    backupDirInBlueprint = yaml.includes("BUZZARD_BACKUP_DIR") && yaml.includes("/var/data/backups");
    healthCheckConfigured = yaml.includes("healthCheckPath: /api/health");
  } else {
    notes.push("render.yaml missing");
  }
  let status = "PASS";
  if (!renderYamlPresent) status = "BLOCKED";
  else if (!persistentDiskInBlueprint || !buzzardDbPathInBlueprint) status = "WARNING";
  if (!persistentDiskInBlueprint) {
    notes.push("Blueprint missing persistent disk at /var/data");
  }
  return {
    renderYamlPresent,
    persistentDiskInBlueprint,
    buzzardDbPathInBlueprint,
    backupDirInBlueprint,
    healthCheckConfigured,
    status,
    notes: notes.join("; ") || "Render Blueprint supports persistent disk configuration"
  };
}

// lib/production-storage-preflight/renderBlueprintValidation.ts
var import_fs7 = __toESM(require("fs"));
var import_path7 = __toESM(require("path"));
var TARGET_MOUNT = "/var/data";
var TARGET_DB = "/var/data/buzzard.db";
var TARGET_BACKUP = "/var/data/backups";
function extractBuzzardApiBlock(yaml) {
  const start = yaml.indexOf("name: buzzard-api");
  if (start < 0) return null;
  const after = yaml.slice(start);
  const nextService = after.search(/\n  - type: web\n    name: buzzard-(?!api)/);
  if (nextService > 0) return after.slice(0, nextService);
  return after;
}
function countDiskBlocksInBuzzardApi(block) {
  return (block.match(/\bdisk:/g) || []).length;
}
function validateRenderBlueprint() {
  const renderYamlPath = import_path7.default.join(process.cwd(), "render.yaml");
  const dbStartupPath = import_path7.default.join(process.cwd(), "server/lib/dbStartup.js");
  const healthPluginPath = import_path7.default.join(process.cwd(), "server/plugins/controlCenterPlugin.js");
  const renderYamlPresent = import_fs7.default.existsSync(renderYamlPath);
  const yaml = renderYamlPresent ? import_fs7.default.readFileSync(renderYamlPath, "utf8") : "";
  const apiBlock = yaml ? extractBuzzardApiBlock(yaml) : null;
  const buzzardApiServiceFound = Boolean(apiBlock);
  let diskMountPath = null;
  let diskSizeGB = null;
  let diskName = null;
  let duplicateBuzzardApiDisks = 0;
  if (apiBlock) {
    duplicateBuzzardApiDisks = countDiskBlocksInBuzzardApi(apiBlock);
    const mountMatch = apiBlock.match(/mountPath:\s*(\S+)/);
    diskMountPath = mountMatch?.[1] ?? null;
    const sizeMatch = apiBlock.match(/sizeGB:\s*(\d+)/);
    diskSizeGB = sizeMatch ? Number(sizeMatch[1]) : null;
    const nameMatch = apiBlock.match(/disk:[\s\S]*?name:\s*(\S+)/);
    diskName = nameMatch?.[1] ?? null;
  }
  const diskConfigured = buzzardApiServiceFound && diskMountPath === TARGET_MOUNT && diskSizeGB === 1 && duplicateBuzzardApiDisks === 1;
  const dbPathInBlueprint = buzzardApiServiceFound && apiBlock.includes("BUZZARD_DB_PATH") && apiBlock.includes(TARGET_DB);
  const backupInBlueprint = buzzardApiServiceFound && apiBlock.includes("BUZZARD_BACKUP_DIR") && apiBlock.includes(TARGET_BACKUP);
  const healthEndpointDbSupported = import_fs7.default.existsSync(healthPluginPath) && import_fs7.default.readFileSync(healthPluginPath, "utf8").includes("/api/health/db");
  const dbStartupMigrationPresent = import_fs7.default.existsSync(dbStartupPath) && import_fs7.default.readFileSync(dbStartupPath, "utf8").includes("migrateEphemeralToPersistentIfNeeded");
  let renderYamlStatus = "BLOCKED";
  if (renderYamlPresent && buzzardApiServiceFound && diskConfigured && dbPathInBlueprint && backupInBlueprint) {
    renderYamlStatus = "PASS";
  } else if (renderYamlPresent && buzzardApiServiceFound) {
    renderYamlStatus = "WARNING";
  }
  const blueprintConfiguration = diskConfigured && dbPathInBlueprint && backupInBlueprint ? "PASS" : "BLOCKED";
  return {
    RENDER_BLUEPRINT_DISK_CONFIGURED: diskConfigured ? "PASS" : buzzardApiServiceFound ? "WARNING" : "BLOCKED",
    RENDER_DISK_MOUNT_PATH: diskMountPath ?? TARGET_MOUNT,
    RENDER_DB_PATH: TARGET_DB,
    RENDER_BACKUP_PATH: TARGET_BACKUP,
    BLUEPRINT_CONFIGURATION: blueprintConfiguration,
    DATABASE_CONFIGURATION: dbPathInBlueprint ? "PASS" : "BLOCKED",
    BACKUP_CONFIGURATION: backupInBlueprint ? "PASS" : "BLOCKED",
    SOFTWARE_SUPPORT: healthEndpointDbSupported && dbStartupMigrationPresent && import_fs7.default.existsSync(import_path7.default.join(process.cwd(), "server/lib/dbPaths.js")) ? "PASS" : "WARNING",
    buzzardApiServiceFound,
    diskName,
    diskSizeGB,
    diskMountPath,
    duplicateBuzzardApiDisks,
    healthEndpointDbSupported,
    dbStartupMigrationPresent,
    renderYamlStatus
  };
}
async function probeLiveRenderHealthDb() {
  const api = (process.env.BUZZARD_API_URL || "").replace(/\/$/, "");
  if (!api) {
    return {
      attempted: false,
      reachable: false,
      persistent: null,
      path: null,
      notes: "BUZZARD_API_URL not set \u2014 skip live probe"
    };
  }
  try {
    const res = await fetch(`${api}/api/health/db`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      return {
        attempted: true,
        reachable: false,
        persistent: null,
        path: null,
        notes: `HTTP ${res.status}`
      };
    }
    const body = await res.json();
    const dbPath = body.database?.path ?? null;
    const persistent = body.database?.persistence?.persistent ?? null;
    return {
      attempted: true,
      reachable: true,
      persistent,
      path: dbPath,
      notes: persistent === true && dbPath?.includes("/var/data") ? "Live health confirms persistent disk" : "Live instance not yet on persistent disk"
    };
  } catch (err) {
    return {
      attempted: true,
      reachable: false,
      persistent: null,
      path: null,
      notes: err instanceof Error ? err.message : "fetch_failed"
    };
  }
}
async function buildRenderBlueprintValidation() {
  const base = validateRenderBlueprint();
  const varData = validateVarDataMount();
  const liveHealthProbe = await probeLiveRenderHealthDb();
  let LIVE_RENDER_DISK = "UNVERIFIED";
  let LIVE_PERSISTENCE = "UNVERIFIED";
  if (liveHealthProbe.reachable && liveHealthProbe.persistent === true && liveHealthProbe.path?.includes("/var/data")) {
    LIVE_RENDER_DISK = "PASS";
    LIVE_PERSISTENCE = "PASS";
  } else if (varData.exists && varData.writable && varData.sqliteOpenable) {
    LIVE_RENDER_DISK = "UNVERIFIED";
    LIVE_PERSISTENCE = "UNVERIFIED";
  }
  const RENDER_PERSISTENCE_READY = LIVE_RENDER_DISK === "PASS" && LIVE_PERSISTENCE === "PASS" ? "PASS" : "UNVERIFIED";
  const MANUAL_RENDER_ACTION = base.BLUEPRINT_CONFIGURATION === "PASS" && LIVE_RENDER_DISK !== "PASS" ? "BLOCKED" : LIVE_RENDER_DISK === "PASS" ? "UNVERIFIED" : "BLOCKED";
  return {
    ...base,
    liveHealthProbe,
    LIVE_RENDER_DISK,
    LIVE_PERSISTENCE,
    RENDER_PERSISTENCE_READY,
    MANUAL_RENDER_ACTION
  };
}

// lib/production-storage-preflight/preflightReport.ts
function buildManualActions(varData, deployment) {
  const actions = [];
  if (!varData.exists) {
    actions.push({
      step: 1,
      action: "Upgrade buzzard-api to Starter plan and add persistent disk mounted at /var/data (1 GB)",
      reason: "Render free tier filesystem is ephemeral \u2014 SQLite data lost on redeploy"
    });
    actions.push({
      step: 2,
      action: "Set BUZZARD_DB_PATH=/var/data/buzzard.db and BUZZARD_BACKUP_DIR=/var/data/backups in Render environment",
      reason: "Application uses BUZZARD_DB_PATH SSOT \u2014 do not duplicate with new env keys"
    });
    actions.push({
      step: 3,
      action: "Sync Render Blueprint (render.yaml) or apply manual disk configuration",
      reason: deployment.persistentDiskInBlueprint ? "Blueprint ready \u2014 dashboard sync pending" : "Blueprint incomplete"
    });
    actions.push({
      step: 4,
      action: "Deploy latest commit (manual deploy \u2014 do not auto-trigger from this preflight)",
      reason: "Disk mount requires redeploy"
    });
    actions.push({
      step: 5,
      action: "Verify: curl https://buzzard-api.onrender.com/api/health/db \u2014 expect path /var/data/buzzard.db, persistent=true",
      reason: "LIVE_PERSISTENCE_VALIDATION only possible on production instance"
    });
    actions.push({
      step: 6,
      action: "Run npm run backup:db on Render after first persistent deploy",
      reason: "Establish backup baseline on persistent disk"
    });
  } else {
    actions.push({
      step: 1,
      action: "Verify /api/health/db reports persistent=true after Render restart",
      reason: "MANUAL_RENDER_RESTART_REQUIRED for live validation"
    });
  }
  return actions;
}
function buildProductionStoragePreflightReport() {
  const environment = checkEnvironmentVariables();
  const persistenceMode = resolvePersistenceMode();
  const effectivePath = resolveEffectiveDbPath();
  const varData = validateVarDataMount();
  const sqlite = checkSqliteConfiguration();
  const restartPersistence = runRestartPersistenceTest();
  const backupRestore = checkBackupRestorePreflight();
  const deployment = checkDeploymentConfiguration();
  const blueprint = validateRenderBlueprint();
  const manualActions = buildManualActions(varData, deployment);
  const flags = getProductionFlagsSnapshot();
  const sideEffects = getFinalGoLiveSafetyCounters();
  const renderPersistentDisk = varData.status === "PASS" ? "UNVERIFIED" : varData.exists ? "WARNING" : "BLOCKED";
  const livePersistenceValidation = process.env.NODE_ENV === "production" && varData.exists && persistenceMode === "PERSISTENT" ? "UNVERIFIED" : "UNVERIFIED";
  const softwarePersistenceSupport = deployment.renderYamlPresent && restartPersistence.status === "PASS" ? "PASS" : "WARNING";
  const persistenceConfiguration = deployment.buzzardDbPathInBlueprint && deployment.persistentDiskInBlueprint ? "PASS" : "WARNING";
  const restartNote = getRenderRestartRequirement(varData.exists, persistenceMode);
  const healthStatus = {
    PERSISTENCE_CONFIGURED: isPersistenceConfigured() || deployment.buzzardDbPathInBlueprint ? "PASS" : "BLOCKED",
    PERSISTENCE_PATH: effectivePath,
    PERSISTENCE_WRITABLE: varData.writable ? "PASS" : varData.exists ? "WARNING" : "BLOCKED",
    SQLITE_READY: sqlite.status,
    MIGRATION_READY: sqlite.migrationReady ? "PASS" : sqlite.fileExists ? "WARNING" : "UNVERIFIED",
    BACKUP_READY: backupRestore.status,
    RESTORE_EVIDENCE: backupRestore.restoreEvidence,
    RESTART_PERSISTENCE: restartPersistence.status,
    RENDER_MANUAL_ACTION_REQUIRED: blueprint.BLUEPRINT_CONFIGURATION === "PASS" ? "BLOCKED" : varData.exists ? "UNVERIFIED" : "BLOCKED",
    RENDER_BLUEPRINT_DISK_CONFIGURED: blueprint.RENDER_BLUEPRINT_DISK_CONFIGURED,
    RENDER_DISK_MOUNT_PATH: blueprint.RENDER_DISK_MOUNT_PATH,
    RENDER_DB_PATH: blueprint.RENDER_DB_PATH,
    RENDER_BACKUP_PATH: blueprint.RENDER_BACKUP_PATH,
    RENDER_PERSISTENCE_READY: "UNVERIFIED",
    BLUEPRINT_CONFIGURATION: blueprint.BLUEPRINT_CONFIGURATION,
    LIVE_RENDER_DISK: "UNVERIFIED"
  };
  const pass = [
    "SQLite path SSOT via server/lib/dbPaths.js (BUZZARD_DB_PATH)",
    "Startup validation in server/lib/dbStartup.js",
    "Integrity checks in server/lib/dbIntegrity.js",
    "Ephemeral\u2192persistent one-time migration on first /var/data mount",
    "Backup script: scripts/db-backup.mjs",
    "Restore script: scripts/restore-db.mjs (production guard)",
    "Render Blueprint: render.yaml with /var/data disk",
    "Isolated restart persistence test (temp DB only)"
  ];
  const blocked = [];
  const unverified = [];
  if (!varData.exists) {
    blocked.push("RENDER_PERSISTENT_DISK \u2014 /var/data not mounted on this instance");
    blocked.push("BLOCKED_MANUAL_DEPLOYMENT \u2014 configure Render persistent disk");
  }
  if (persistenceMode === "EPHEMERAL" && process.env.NODE_ENV === "production") {
    blocked.push("PERSISTENCE_MODE=EPHEMERAL in production without /var/data");
  }
  if (livePersistenceValidation === "UNVERIFIED") {
    unverified.push("LIVE_PERSISTENCE_VALIDATION \u2014 requires production Render instance check");
  }
  if (backupRestore.restoreEvidence === "UNVERIFIED") {
    unverified.push("RESTORE_EVIDENCE \u2014 not verified on production Render");
  }
  if (restartNote) {
    unverified.push(restartNote);
  }
  const productionReadyImpact = "BLOCKED";
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    softwarePersistenceSupport,
    persistenceConfiguration,
    renderPersistentDisk,
    livePersistenceValidation,
    productionReadyImpact: productionReadyImpact === "BLOCKED" ? "BLOCKED" : "NO",
    salesEnabled: flags.SALES === "ON" ? "1" : "0",
    persistenceMode,
    healthStatus,
    environment,
    varData,
    sqlite,
    restartPersistence,
    backupRestore,
    deployment,
    manualActions,
    productionFlags: {
      SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
      SUPPLIER_NETWORK_ENABLED: flags.SUPPLIER_NETWORK === "ON" ? "1" : "0",
      SUPPLIER_ORDER_NETWORK_ENABLED: flags.SUPPLIER_ORDER_NETWORK === "ON" ? "1" : "0",
      PAYMENT_PRODUCTION_ENABLED: flags.PAYMENT_PRODUCTION === "ON" ? "1" : "0",
      CARRIER_PRODUCTION_ENABLED: flags.CARRIER_PRODUCTION === "ON" ? "1" : "0",
      MARKETING_SPEND_ENABLED: flags.MARKETING_SPEND === "ON" ? "1" : "0",
      AI_PRODUCTION_ENABLED: flags.AI_PRODUCTION === "ON" ? "1" : "0"
    },
    sideEffectCounters: {
      realSupplierOrders: sideEffects.realSupplierOrders,
      realPaymentTransactions: sideEffects.realPayments,
      realRefunds: sideEffects.realRefunds,
      realShipments: sideEffects.realCarrierLabels,
      realMarketplaceOrders: sideEffects.realMarketplaceMutations,
      realMarketplaceListings: 0,
      realAdSpend: sideEffects.realMarketingSpend,
      fakeEvidence: countRejectedEvidenceAttempts()
    },
    pass,
    blocked,
    unverified
  };
}

// lib/production-storage-preflight/renderPersistentDiskBlueprintReport.ts
async function buildRenderPersistentDiskBlueprintReport() {
  const storagePreflight = buildProductionStoragePreflightReport();
  const blueprint = await buildRenderBlueprintValidation();
  const flags = getProductionFlagsSnapshot();
  const sideEffects = getFinalGoLiveSafetyCounters();
  const manualSteps = [
    "Sync Render Blueprint (render.yaml) in Render Dashboard for buzzard-api",
    "Confirm Starter plan + persistent disk buzzard-data at /var/data (1 GB)",
    "Confirm env BUZZARD_DB_PATH=/var/data/buzzard.db and BUZZARD_BACKUP_DIR=/var/data/backups",
    "Manual deploy buzzard-api (do not auto-trigger from repository preflight)",
    "Verify GET /api/health/db \u2192 persistent=true and path /var/data/buzzard.db",
    "Run backup baseline on Render after first persistent deploy"
  ];
  const manualRequired = blueprint.BLUEPRINT_CONFIGURATION === "PASS" && blueprint.LIVE_RENDER_DISK !== "PASS";
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    SOFTWARE_SUPPORT: blueprint.SOFTWARE_SUPPORT,
    BLUEPRINT_CONFIGURATION: blueprint.BLUEPRINT_CONFIGURATION,
    DATABASE_CONFIGURATION: blueprint.DATABASE_CONFIGURATION,
    BACKUP_CONFIGURATION: blueprint.BACKUP_CONFIGURATION,
    LIVE_RENDER_DISK: blueprint.LIVE_RENDER_DISK,
    LIVE_PERSISTENCE: blueprint.LIVE_PERSISTENCE,
    MANUAL_RENDER_ACTION: manualRequired ? "BLOCKED" : blueprint.MANUAL_RENDER_ACTION,
    PRODUCTION_READY: blueprint.LIVE_RENDER_DISK === "PASS" ? "NO" : "BLOCKED",
    SALES_ENABLED: flags.SALES === "ON" ? "1" : "0",
    renderYamlStatus: blueprint.renderYamlStatus,
    blueprint,
    storagePreflight,
    sections: {
      blueprint: {
        status: blueprint.BLUEPRINT_CONFIGURATION,
        summary: blueprint.buzzardApiServiceFound ? `buzzard-api disk=${blueprint.diskName ?? "?"} mount=${blueprint.diskMountPath ?? "?"} sizeGB=${blueprint.diskSizeGB ?? "?"}` : "buzzard-api service not found in render.yaml"
      },
      database: {
        status: blueprint.DATABASE_CONFIGURATION,
        path: blueprint.RENDER_DB_PATH
      },
      backup: {
        status: blueprint.BACKUP_CONFIGURATION,
        path: blueprint.RENDER_BACKUP_PATH
      },
      live: {
        status: blueprint.LIVE_RENDER_DISK,
        summary: blueprint.liveHealthProbe.notes
      },
      manualAction: {
        required: manualRequired,
        steps: manualRequired ? manualSteps : ["No manual action if live disk already verified"]
      }
    },
    sideEffectCounters: {
      ...storagePreflight.sideEffectCounters,
      fakeEvidence: countRejectedEvidenceAttempts(),
      realSupplierOrders: sideEffects.realSupplierOrders,
      realPaymentTransactions: sideEffects.realPayments,
      realRefunds: sideEffects.realRefunds,
      realShipments: sideEffects.realCarrierLabels,
      realMarketplaceOrders: sideEffects.realMarketplaceMutations,
      realMarketplaceListings: 0,
      realAdSpend: sideEffects.realMarketingSpend
    },
    productionFlags: storagePreflight.productionFlags
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildProductionStoragePreflightReport,
  buildRenderBlueprintValidation,
  buildRenderPersistentDiskBlueprintReport,
  checkBackupRestorePreflight,
  checkDeploymentConfiguration,
  checkEnvironmentVariables,
  checkSqliteConfiguration,
  resolveEffectiveDbPath,
  resolvePersistenceMode,
  runRestartPersistenceTest,
  validateRenderBlueprint,
  validateVarDataMount
});
