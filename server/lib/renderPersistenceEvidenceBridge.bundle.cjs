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

// lib/render-persistence-evidence-bridge/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  buildRenderPersistenceGoLiveSteps: () => buildRenderPersistenceGoLiveSteps,
  buildRenderPersistenceHumanActions: () => buildRenderPersistenceHumanActions,
  buildRenderPersistenceLiveStatus: () => buildRenderPersistenceLiveStatus,
  buildRenderPersistenceLocalHints: () => buildRenderPersistenceLocalHints,
  buildRenderPersistenceVerificationReport: () => buildRenderPersistenceVerificationReport,
  evaluateHealthDbResponse: () => evaluateHealthDbResponse,
  listRenderPersistenceEvidence: () => listRenderPersistenceEvidence,
  registerRenderPersistenceEvidence: () => registerRenderPersistenceEvidence
});
module.exports = __toCommonJS(serverEntry_exports);

// lib/production-access/evidencePolicy.ts
var rejectedAttempts = 0;
function countRejectedEvidenceAttempts() {
  return rejectedAttempts;
}
function recordRejectedEvidenceAttempt() {
  rejectedAttempts += 1;
}

// lib/production-storage-preflight/renderBlueprintValidation.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));

// lib/production-storage-preflight/varDataValidation.ts
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));

// lib/production-storage-preflight/environmentValidation.ts
var CANONICAL_MOUNT = "/var/data";

// lib/production-storage-preflight/varDataValidation.ts
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

// lib/production-storage-preflight/renderBlueprintValidation.ts
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
function manualRenderActionForBlueprint(blueprintConfiguration, liveRenderDisk) {
  if (blueprintConfiguration === "PASS" && liveRenderDisk !== "PASS") return "BLOCKED";
  if (liveRenderDisk === "PASS") return "UNVERIFIED";
  return "BLOCKED";
}
function validateRenderBlueprint() {
  const renderYamlPath = import_path2.default.join(process.cwd(), "render.yaml");
  const dbStartupPath = import_path2.default.join(process.cwd(), "server/lib/dbStartup.js");
  const healthPluginPath = import_path2.default.join(process.cwd(), "server/plugins/controlCenterPlugin.js");
  const renderYamlPresent = import_fs2.default.existsSync(renderYamlPath);
  const yaml = renderYamlPresent ? import_fs2.default.readFileSync(renderYamlPath, "utf8") : "";
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
  const healthEndpointDbSupported = import_fs2.default.existsSync(healthPluginPath) && import_fs2.default.readFileSync(healthPluginPath, "utf8").includes("/api/health/db");
  const dbStartupMigrationPresent = import_fs2.default.existsSync(dbStartupPath) && import_fs2.default.readFileSync(dbStartupPath, "utf8").includes("migrateEphemeralToPersistentIfNeeded");
  let renderYamlStatus = "BLOCKED";
  if (renderYamlPresent && buzzardApiServiceFound && diskConfigured && dbPathInBlueprint && backupInBlueprint) {
    renderYamlStatus = "PASS";
  } else if (renderYamlPresent && buzzardApiServiceFound) {
    renderYamlStatus = "WARNING";
  }
  const blueprintConfiguration = diskConfigured && dbPathInBlueprint && backupInBlueprint ? "PASS" : "BLOCKED";
  let LIVE_RENDER_DISK = "UNVERIFIED";
  const LIVE_PERSISTENCE = "UNVERIFIED";
  const RENDER_PERSISTENCE_READY = "UNVERIFIED";
  const MANUAL_RENDER_ACTION = manualRenderActionForBlueprint(blueprintConfiguration, LIVE_RENDER_DISK);
  return {
    RENDER_BLUEPRINT_DISK_CONFIGURED: diskConfigured ? "PASS" : buzzardApiServiceFound ? "WARNING" : "BLOCKED",
    RENDER_DISK_MOUNT_PATH: diskMountPath ?? TARGET_MOUNT,
    RENDER_DB_PATH: TARGET_DB,
    RENDER_BACKUP_PATH: TARGET_BACKUP,
    RENDER_PERSISTENCE_READY,
    BLUEPRINT_CONFIGURATION: blueprintConfiguration,
    DATABASE_CONFIGURATION: dbPathInBlueprint ? "PASS" : "BLOCKED",
    BACKUP_CONFIGURATION: backupInBlueprint ? "PASS" : "BLOCKED",
    LIVE_RENDER_DISK,
    LIVE_PERSISTENCE,
    MANUAL_RENDER_ACTION,
    SOFTWARE_SUPPORT: healthEndpointDbSupported && dbStartupMigrationPresent && import_fs2.default.existsSync(import_path2.default.join(process.cwd(), "server/lib/dbPaths.js")) ? "PASS" : "WARNING",
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

// lib/production-storage-preflight/restartPersistenceTest.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var TEST_TABLE = "buzzard_preflight_restart_test";
var TEST_KEY = "preflight_marker";
function loadSqlite2() {
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
  const Database = loadSqlite2();
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

// lib/render-persistence-evidence-bridge/persistenceStatus.ts
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));

// lib/render-persistence-evidence-bridge/evidenceStore.ts
var import_crypto2 = require("crypto");

// lib/render-persistence-evidence-bridge/evidenceHash.ts
var import_crypto = require("crypto");
var FORBIDDEN_HASH_KEYS = ["secret", "token", "password", "apiKey", "authorization"];
function hashRenderPersistenceEvidenceMetadata(input) {
  const safe = {
    kind: input.kind,
    environment: input.environment,
    source: input.source,
    timestamp: input.timestamp,
    endpoint: input.endpoint,
    dbPath: input.dbPath,
    persistent: input.persistent,
    backupPath: input.backupPath,
    healthStatus: input.healthStatus,
    restartVerified: input.restartVerified,
    evidenceReference: input.evidenceReference,
    operator: input.operator,
    expiresAt: input.expiresAt,
    restart: input.restart,
    backup: input.backup ? {
      backupPath: input.backup.backupPath,
      databasePath: input.backup.databasePath,
      success: input.backup.success,
      artifactReference: input.backup.artifactReference
    } : void 0,
    restore: input.restore ? { success: input.restore.success, artifactReference: input.restore.artifactReference } : void 0
  };
  const json = JSON.stringify(safe);
  for (const k of FORBIDDEN_HASH_KEYS) {
    if (json.toLowerCase().includes(k)) {
      throw new Error("EVIDENCE_HASH_FORBIDDEN_FIELD");
    }
  }
  return (0, import_crypto.createHash)("sha256").update(json).digest("hex");
}

// lib/render-persistence-evidence-bridge/evidenceValidation.ts
var TARGET_DB2 = "/var/data/buzzard.db";
var TARGET_BACKUP2 = "/var/data/backups";
var TARGET_MOUNT2 = "/var/data";
function assertRenderLiveEvidenceSource(input) {
  if (input.source !== "RENDER_LIVE") {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:SOURCE_NOT_RENDER_LIVE");
  }
  if (input.environment !== "PRODUCTION" && input.environment !== "CONTROLLED_VALIDATION") {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:ENVIRONMENT_NOT_PRODUCTION");
  }
  if (!input.timestamp || !input.evidenceReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:MISSING_REFERENCE_OR_TIMESTAMP");
  }
  if (!input.operator?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:MISSING_OPERATOR");
  }
}
function validateHealthEvidenceFields(input) {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_PERSISTENCE_HEALTH") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  if (input.persistent !== true) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:PERSISTENT_NOT_TRUE");
  }
  if (!input.dbPath?.includes(TARGET_MOUNT2) || !input.dbPath.includes("buzzard.db")) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:WRONG_DB_PATH");
  }
  if (!input.endpoint?.includes("/api/health/db")) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:ENDPOINT_NOT_HEALTH_DB");
  }
}
function validateRestartEvidenceFields(input) {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_RESTART_PERSISTENCE") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  const r = input.restart;
  if (!r?.before || !r.after || !r.databaseIntegrity) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTART_FIELDS_INCOMPLETE");
  }
  if (r.samePersistentPath !== true) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTART_PATH_NOT_SAME");
  }
  if (r.databaseIntegrity !== "ok") {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTART_INTEGRITY_NOT_OK");
  }
}
function validateBackupEvidenceFields(input) {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_BACKUP") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  const b = input.backup;
  if (!b?.success || !b.backupPath?.includes(TARGET_BACKUP2) || !b.databasePath?.includes(TARGET_DB2)) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:BACKUP_INVALID");
  }
  if (!b.artifactReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:BACKUP_MISSING_ARTIFACT_REF");
  }
}
function validateRestoreEvidenceFields(input) {
  assertRenderLiveEvidenceSource(input);
  if (input.kind !== "RENDER_RESTORE") {
    throw new Error("RENDER_EVIDENCE:KIND_MISMATCH");
  }
  if (!input.restore?.artifactReference?.trim()) {
    recordRejectedEvidenceAttempt();
    throw new Error("RENDER_EVIDENCE:RESTORE_MISSING_ARTIFACT_REF");
  }
}
function validateRenderPersistenceEvidenceInput(input) {
  switch (input.kind) {
    case "RENDER_PERSISTENCE_HEALTH":
      validateHealthEvidenceFields(input);
      break;
    case "RENDER_RESTART_PERSISTENCE":
      validateRestartEvidenceFields(input);
      break;
    case "RENDER_BACKUP":
      validateBackupEvidenceFields(input);
      break;
    case "RENDER_RESTORE":
      validateRestoreEvidenceFields(input);
      break;
    default:
      recordRejectedEvidenceAttempt();
      throw new Error("RENDER_EVIDENCE:UNKNOWN_KIND");
  }
}
var RENDER_PERSISTENCE_TARGETS = {
  mount: TARGET_MOUNT2,
  db: TARGET_DB2,
  backup: TARGET_BACKUP2
};

// lib/render-persistence-evidence-bridge/evidenceStore.ts
var store = /* @__PURE__ */ new Map();
var hashIndex = /* @__PURE__ */ new Set();
function isExpired(e, now = Date.now()) {
  if (!e.expiresAt) return false;
  const t = Date.parse(e.expiresAt);
  return Number.isFinite(t) && t < now;
}
function registerRenderPersistenceEvidence(input) {
  validateRenderPersistenceEvidenceInput(input);
  const payloadHash = hashRenderPersistenceEvidenceMetadata(input);
  const dedupeKey = `${input.kind}:${payloadHash}:${input.evidenceReference}`;
  if (hashIndex.has(deduplicateKey(dedupeKey))) {
    throw new Error("RENDER_EVIDENCE:DUPLICATE");
  }
  const evidence = {
    id: (0, import_crypto2.randomUUID)(),
    ...input,
    payloadHash
  };
  store.set(evidence.id, evidence);
  hashIndex.add(deduplicateKey(dedupeKey));
  return evidence;
}
function deduplicateKey(key) {
  return key;
}
function listRenderPersistenceEvidence(includeExpired = false) {
  const all = [...store.values()];
  if (includeExpired) return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all.filter((e) => !isExpired(e)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
function countExpiredRenderPersistenceEvidence() {
  return [...store.values()].filter((e) => isExpired(e)).length;
}

// lib/render-persistence-evidence-bridge/persistenceStatus.ts
function mapBlueprint(blueprintPass) {
  return blueprintPass ? "VALIDATED" : "BLOCKED";
}
function liveFromEvidence(kind, predicate) {
  const active = listRenderPersistenceEvidence(false).filter((e) => e.kind === kind && e.source === "RENDER_LIVE");
  if (active.some(predicate)) return "VALIDATED";
  return "UNVERIFIED_EXTERNAL";
}
function buildRenderPersistenceLiveStatus() {
  const blueprint = validateRenderBlueprint();
  const blueprintOk = blueprint.BLUEPRINT_CONFIGURATION === "PASS";
  const healthEvidence = listRenderPersistenceEvidence(false).filter(
    (e) => e.kind === "RENDER_PERSISTENCE_HEALTH" && e.source === "RENDER_LIVE"
  );
  const healthValid = healthEvidence.some((e) => e.persistent === true && e.dbPath?.includes("/var/data/buzzard.db"));
  const LIVE_RENDER_DISK = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_DB_PATH = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_DB_HEALTH = healthValid ? "VALIDATED" : "UNVERIFIED_EXTERNAL";
  const LIVE_RESTART_PERSISTENCE = liveFromEvidence(
    "RENDER_RESTART_PERSISTENCE",
    (e) => e.restart?.samePersistentPath === true && e.restart.databaseIntegrity === "ok"
  );
  const LIVE_BACKUP = liveFromEvidence(
    "RENDER_BACKUP",
    (e) => e.backup?.success === true && Boolean(e.backup.backupPath?.includes("/var/data/backups"))
  );
  const LIVE_RESTORE = liveFromEvidence("RENDER_RESTORE", (e) => e.restore?.success === true);
  let PERSISTENCE = "HUMAN_REQUIRED";
  if (!blueprintOk) {
    PERSISTENCE = "BLOCKED";
  } else if (LIVE_RENDER_DISK === "VALIDATED" && LIVE_DB_PATH === "VALIDATED" && LIVE_DB_HEALTH === "VALIDATED" && LIVE_RESTART_PERSISTENCE === "VALIDATED" && LIVE_BACKUP === "VALIDATED") {
    PERSISTENCE = "VALIDATED";
  } else if (blueprintOk) {
    PERSISTENCE = "HUMAN_REQUIRED";
  }
  return {
    BLUEPRINT_CONFIGURATION: mapBlueprint(blueprintOk),
    LIVE_RENDER_DISK,
    LIVE_DB_PATH,
    LIVE_DB_HEALTH,
    LIVE_RESTART_PERSISTENCE,
    LIVE_BACKUP,
    LIVE_RESTORE,
    PERSISTENCE
  };
}
function buildRenderPersistenceLocalHints() {
  const varData = validateVarDataMount();
  const restart = runRestartPersistenceTest();
  const backupScript = import_fs4.default.existsSync(import_path4.default.join(process.cwd(), "scripts/db-backup.mjs"));
  return {
    localVarDataWritable: varData.exists && varData.writable && varData.sqliteOpenable,
    localRestartTest: restart.status === "PASS" ? "PASS" : "WARNING",
    localBackupScriptPresent: backupScript,
    note: "Local hints never promote LIVE_* to VALIDATED"
  };
}

// lib/render-persistence-evidence-bridge/humanActions.ts
function buildRenderPersistenceHumanActions() {
  const live = buildRenderPersistenceLiveStatus();
  const actions = [];
  if (live.BLUEPRINT_CONFIGURATION === "VALIDATED" && live.LIVE_RENDER_DISK !== "VALIDATED") {
    actions.push({
      priority: 1,
      provider: "Render",
      action: "Create/mount Persistent Disk on buzzard-api \u2014 path /var/data, size \u2265 1 GB",
      why: "Production SQLite requires Render persistent volume",
      requiredEvidence: "RENDER_PERSISTENCE_HEALTH",
      verificationMethod: "Deploy, then GET /api/health/db \u2192 persistent=true, path /var/data/buzzard.db",
      blocking: true
    });
    actions.push({
      priority: 2,
      provider: "Render",
      action: "Deploy buzzard-api after disk mount and env BUZZARD_DB_PATH / BUZZARD_BACKUP_DIR",
      why: "Blueprint env vars must apply to running service",
      requiredEvidence: "RENDER_PERSISTENCE_HEALTH",
      verificationMethod: "GET /api/health/db on production URL",
      blocking: true
    });
  }
  if (live.LIVE_RENDER_DISK !== "VALIDATED") {
    actions.push({
      priority: 3,
      provider: "Render",
      action: "Verify /api/health/db (persistent=true, /var/data/buzzard.db) and register RENDER_LIVE evidence",
      why: "Control center only accepts explicit external evidence",
      requiredEvidence: "LIVE_HEALTH",
      verificationMethod: "Operator-run curl + evidence registration (no auto-fetch in CI)",
      blocking: true
    });
  }
  if (live.LIVE_BACKUP !== "VALIDATED") {
    actions.push({
      priority: 4,
      provider: "Render",
      action: "Run npm run backup:db on production instance; store backup artifact reference",
      why: "Backup path /var/data/backups must be proven with RENDER_BACKUP evidence",
      requiredEvidence: "RENDER_BACKUP",
      verificationMethod: "Artifact reference + metadata hash (no DB file in git)",
      blocking: true
    });
  }
  if (live.LIVE_RESTART_PERSISTENCE !== "VALIDATED") {
    actions.push({
      priority: 5,
      provider: "Render",
      action: "Manual production restart; re-check /api/health/db; register RENDER_RESTART_PERSISTENCE evidence",
      why: "Cursor cannot trigger production restart \u2014 operator must verify same DB path after restart",
      requiredEvidence: "RENDER_RESTART_PERSISTENCE",
      verificationMethod: "before/after health + integrity ok + samePersistentPath",
      blocking: true
    });
  }
  return actions.sort((a, b) => a.priority - b.priority);
}

// lib/render-persistence-evidence-bridge/renderPersistenceReport.ts
function buildRenderPersistenceVerificationReport() {
  const live = buildRenderPersistenceLiveStatus();
  const localHints = buildRenderPersistenceLocalHints();
  const actions = buildRenderPersistenceHumanActions();
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    live,
    localHints,
    acceptedEvidenceCount: listRenderPersistenceEvidence(false).length,
    expiredEvidenceCount: countExpiredRenderPersistenceEvidence(),
    rejectedEvidenceAttempts: countRejectedEvidenceAttempts(),
    nextHumanAction: actions[0]?.action,
    humanActionCount: actions.length
  };
}

// lib/render-persistence-evidence-bridge/goLivePersistenceGraph.ts
function buildRenderPersistenceGoLiveSteps() {
  const live = buildRenderPersistenceLiveStatus();
  const step = (id, label, status, blockingReason) => ({
    id,
    label,
    status,
    blockingReason,
    requiredHumanApproval: status === "HUMAN_REQUIRED" || status === "UNVERIFIED_EXTERNAL"
  });
  return [
    step(
      "blueprint-configuration",
      "BLUEPRINT_CONFIGURATION",
      live.BLUEPRINT_CONFIGURATION === "VALIDATED" ? "CONFIGURED" : "BLOCKED"
    ),
    step(
      "render-persistent-disk",
      "RENDER_PERSISTENT_DISK",
      live.LIVE_RENDER_DISK === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL",
      live.LIVE_RENDER_DISK === "VALIDATED" ? void 0 : "LIVE_DISK_EVIDENCE_REQUIRED"
    ),
    step(
      "live-db-health",
      "LIVE_DB_HEALTH",
      live.LIVE_DB_HEALTH === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL"
    ),
    step(
      "restart-persistence",
      "RESTART_PERSISTENCE",
      live.LIVE_RESTART_PERSISTENCE === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL"
    ),
    step(
      "backup",
      "BACKUP",
      live.LIVE_BACKUP === "VALIDATED" ? "VALIDATED" : "UNVERIFIED_EXTERNAL"
    ),
    step(
      "persistence-validated",
      "PERSISTENCE_VALIDATED",
      live.PERSISTENCE === "VALIDATED" ? "VALIDATED" : live.PERSISTENCE === "HUMAN_REQUIRED" ? "HUMAN_REQUIRED" : "BLOCKED",
      live.PERSISTENCE === "VALIDATED" ? void 0 : "RENDER_LIVE_EVIDENCE_INCOMPLETE"
    )
  ];
}

// lib/render-persistence-evidence-bridge/healthDbEvaluation.ts
function evaluateHealthDbResponse(body) {
  const reasons = [];
  const path5 = body.database?.path ?? null;
  const persistent = body.database?.persistence?.persistent ?? null;
  const backupPath = body.database?.persistence?.backupDir ?? null;
  const integrityHint = body.database?.error ? `error:${body.database.error}` : "unknown";
  if (persistent !== true) reasons.push("persistent_not_true");
  if (!path5?.includes(RENDER_PERSISTENCE_TARGETS.mount) || !path5.includes("buzzard.db")) {
    reasons.push("db_path_not_var_data");
  }
  if (backupPath && !backupPath.includes(RENDER_PERSISTENCE_TARGETS.backup)) {
    reasons.push("backup_path_not_var_data_backups");
  }
  const meetsLivePersistenceCriteria = persistent === true && Boolean(path5?.includes(RENDER_PERSISTENCE_TARGETS.mount) && path5.includes("buzzard.db"));
  return {
    persistent,
    path: path5,
    backupPath,
    integrityHint,
    meetsLivePersistenceCriteria,
    reasons
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildRenderPersistenceGoLiveSteps,
  buildRenderPersistenceHumanActions,
  buildRenderPersistenceLiveStatus,
  buildRenderPersistenceLocalHints,
  buildRenderPersistenceVerificationReport,
  evaluateHealthDbResponse,
  listRenderPersistenceEvidence,
  registerRenderPersistenceEvidence
});
