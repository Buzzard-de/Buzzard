"use strict";
/**
 * Production SQLite + Render persistent-disk verification (read-only).
 * Uses the same path resolvers as db startup. Never mutates the DB.
 */
const crypto = require("crypto");
const nodeFs = require("fs");
const nodePath = require("path");
const { resolveDbPath, resolveBackupDir } = require("./dbPaths");

const MOUNT_PATH = "/var/data";
const EXPECTED_PRODUCTION_DB = "/var/data/buzzard.db";
const EXPECTED_PRODUCTION_BACKUP = "/var/data/backups";

function createProductionDbVerification(db, options = {}) {
  const fs = options.fs || nodeFs;
  const path = options.path || nodePath;
  const env = options.env || process.env;
  const nowFn = options.now || (() => new Date());
  const idFactory = options.idFactory || (() => crypto.randomUUID());
  const resolveConfiguredPath = options.resolveDbPath || resolveDbPath;
  const resolveConfiguredBackup = options.resolveBackupDir || resolveBackupDir;

  function safeResolve(raw) {
    if (typeof raw !== "string" || !raw.trim()) return null;
    if (raw.includes("\0")) return null;
    const resolved = path.resolve(raw.trim());
    const normalized = path.normalize(resolved);
    const rel = path.relative(path.parse(normalized).root, normalized);
    if (rel.split(path.sep).includes("..")) return null;
    return normalized;
  }

  function isInside(target, root) {
    if (!target || !root) return false;
    const file = path.resolve(target);
    const dir = path.resolve(root);
    return file === dir || file.startsWith(dir + path.sep);
  }

  function tryRealpath(target) {
    if (!target) return null;
    try {
      if (typeof fs.realpathSync === "function") {
        return fs.realpathSync(target);
      }
    } catch {
      return target;
    }
    return target;
  }

  function accessFlags(target, flags) {
    try {
      fs.accessSync(target, flags);
      return true;
    } catch {
      return false;
    }
  }

  function inspectDir(dirPath) {
    if (!dirPath) {
      return { exists: false, directory: false, readable: false, writable: false };
    }
    let exists = false;
    let directory = false;
    try {
      exists = fs.existsSync(dirPath);
      if (exists) directory = Boolean(fs.statSync(dirPath).isDirectory());
    } catch {
      exists = false;
    }
    const readable = exists && accessFlags(dirPath, fs.constants.R_OK);
    const writable = exists && accessFlags(dirPath, fs.constants.W_OK);
    return { exists, directory, readable, writable };
  }

  function inspectFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      return { exists: false, sizeBytes: null, modifiedAt: null, filename: filePath ? path.basename(filePath) : null };
    }
    try {
      const stat = fs.statSync(filePath);
      return {
        exists: Boolean(stat.isFile()),
        sizeBytes: Number(stat.size) || 0,
        modifiedAt: stat.mtime ? new Date(stat.mtime).toISOString() : null,
        filename: path.basename(filePath),
      };
    } catch {
      return { exists: false, sizeBytes: null, modifiedAt: null, filename: path.basename(filePath) };
    }
  }

  function readSqliteMeta() {
    if (typeof options.readSqliteMeta === "function") {
      return options.readSqliteMeta();
    }
    const meta = {
      connected: false,
      integrityCheck: null,
      journalMode: null,
      databaseList: [],
      mainPath: null,
    };
    if (!db || typeof db.prepare !== "function") {
      return meta;
    }
    try {
      const rows = db.prepare("PRAGMA database_list").all();
      meta.databaseList = (rows || []).map((row) => ({
        name: row.name || row.Name || null,
        file: row.file || row.File || "",
      }));
      const main = meta.databaseList.find((row) => row.name === "main") || meta.databaseList[0];
      meta.mainPath = main?.file || "";
      meta.connected = true;
    } catch {
      meta.connected = false;
    }
    try {
      const row = db.prepare("PRAGMA integrity_check").get();
      if (typeof row === "string") {
        meta.integrityCheck = row;
      } else if (row && typeof row.integrity_check === "string") {
        meta.integrityCheck = row.integrity_check;
      } else {
        meta.integrityCheck = "unknown";
      }
    } catch (err) {
      meta.integrityCheck = `error:${err.message}`;
    }
    try {
      const row = db.prepare("PRAGMA journal_mode").get();
      meta.journalMode = row?.journal_mode || (typeof row === "string" ? row : null);
    } catch {
      meta.journalMode = null;
    }
    return meta;
  }

  function verifyProductionDb({ correlationId = null } = {}) {
    const verifiedAt = nowFn().toISOString();
    const verificationId = idFactory();
    const checksPassed = [];
    const checksFailed = [];
    const reasons = [];

    const nodeEnv = env.NODE_ENV || "development";
    const isProduction = nodeEnv === "production";
    const salesEnabled = env.BUZZARD_SALES_ENABLED === "1";
    const productSotActive = env.BUZZARD_PRODUCT_SOT_ACTIVE === "1";

    const configuredPath = safeResolve(resolveConfiguredPath());
    const resolvedPath = configuredPath ? tryRealpath(configuredPath) || configuredPath : null;
    const backupConfigured = safeResolve(resolveConfiguredBackup());
    const backupResolved = backupConfigured ? tryRealpath(backupConfigured) || backupConfigured : null;

    if (!configuredPath) {
      checksFailed.push("configured_path");
      reasons.push("INVALID_DB_PATH");
    } else {
      checksPassed.push("configured_path");
    }

    const fileMeta = inspectFile(resolvedPath || configuredPath);
    const mount = inspectDir(MOUNT_PATH);
    const backupInfo = inspectDir(backupResolved || backupConfigured);

    const sqlite = readSqliteMeta();
    const sqliteMainResolved = sqlite.mainPath ? tryRealpath(sqlite.mainPath) || safeResolve(sqlite.mainPath) : null;

    const pathOnMount = Boolean(
      resolvedPath && isInside(resolvedPath, MOUNT_PATH)
    );
    const sqliteOnMount = Boolean(
      sqliteMainResolved && isInside(sqliteMainResolved, MOUNT_PATH)
    );
    const expectedConfigured =
      configuredPath === path.resolve(EXPECTED_PRODUCTION_DB) || pathOnMount;

    if (isProduction) {
      if (!expectedConfigured || !pathOnMount) {
        checksFailed.push("production_db_on_disk");
        reasons.push("PRODUCTION_DB_NOT_ON_PERSISTENT_DISK");
      } else {
        checksPassed.push("production_db_on_disk");
      }
      if (!mount.exists || !mount.directory) {
        checksFailed.push("mount_exists");
        reasons.push("PERSISTENT_MOUNT_MISSING");
      } else {
        checksPassed.push("mount_exists");
      }
      if (!mount.readable) {
        checksFailed.push("mount_readable");
        reasons.push("PERSISTENT_MOUNT_NOT_READABLE");
      } else {
        checksPassed.push("mount_readable");
      }
      if (!mount.writable) {
        checksFailed.push("mount_writable");
        reasons.push("PERSISTENT_MOUNT_NOT_WRITABLE");
      } else {
        checksPassed.push("mount_writable");
      }
      if (!fileMeta.exists) {
        checksFailed.push("db_file_exists");
        reasons.push("PRODUCTION_DB_FILE_MISSING");
      } else {
        checksPassed.push("db_file_exists");
      }
      if (!sqlite.connected) {
        checksFailed.push("sqlite_connected");
        reasons.push("SQLITE_NOT_CONNECTED");
      } else {
        checksPassed.push("sqlite_connected");
      }
      if (sqlite.connected) {
        const samePath =
          Boolean(sqliteMainResolved && resolvedPath) &&
          path.resolve(String(sqliteMainResolved)) === path.resolve(String(resolvedPath));
        if (!sqliteOnMount || !samePath) {
          checksFailed.push("sqlite_path_match");
          reasons.push("SQLITE_DB_PATH_MISMATCH");
        } else {
          checksPassed.push("sqlite_path_match");
        }
      }
      if (sqlite.integrityCheck !== "ok") {
        checksFailed.push("integrity_check");
        reasons.push("SQLITE_INTEGRITY_CHECK_FAILED");
      } else {
        checksPassed.push("integrity_check");
      }
      const backupOnMount = Boolean(backupResolved && isInside(backupResolved, MOUNT_PATH));
      if (!backupOnMount || !backupInfo.exists || !backupInfo.directory) {
        checksFailed.push("backup_directory");
        reasons.push("BACKUP_PATH_NOT_ON_PERSISTENT_DISK");
      } else {
        checksPassed.push("backup_directory");
      }
      if (backupOnMount && !backupInfo.writable) {
        checksFailed.push("backup_writable");
        reasons.push("BACKUP_DIRECTORY_NOT_WRITABLE");
      } else if (backupOnMount) {
        checksPassed.push("backup_writable");
      }
    } else {
      checksPassed.push("non_production_path_requirement_skipped");
      if (sqlite.connected) checksPassed.push("sqlite_connected");
      else {
        checksFailed.push("sqlite_connected");
        reasons.push("SQLITE_NOT_CONNECTED");
      }
      if (sqlite.integrityCheck === "ok") checksPassed.push("integrity_check");
      else if (sqlite.integrityCheck) {
        checksFailed.push("integrity_check");
        reasons.push("SQLITE_INTEGRITY_CHECK_FAILED");
      }
    }

    if (salesEnabled) {
      checksFailed.push("sales_locked");
      reasons.push("SALES_NOT_LOCKED");
    } else {
      checksPassed.push("sales_locked");
    }
    if (productSotActive) {
      checksFailed.push("product_sot_locked");
      reasons.push("PRODUCT_SOT_NOT_LOCKED");
    } else {
      checksPassed.push("product_sot_locked");
    }

    const runtimePersistent =
      isProduction &&
      pathOnMount &&
      mount.exists &&
      mount.directory &&
      sqliteOnMount &&
      fileMeta.exists &&
      sqlite.integrityCheck === "ok";

    const persistent = runtimePersistent;
    const mode = persistent ? "render_persistent_disk" : isProduction ? "production_ephemeral" : "development_default";

    const runtimeVerified = isProduction && persistent && !salesEnabled && !productSotActive && checksFailed.length === 0;

    const redeployProof = {
      verified: false,
      status: "REDEPLOY_PERSISTENCE_PROOF_REQUIRED",
    };

    let status = "FAIL";
    if (runtimeVerified && redeployProof.verified) status = "PASS";
    else if (runtimeVerified) status = "CONDITIONAL";
    else status = "FAIL";

    const verified = runtimeVerified;

    return {
      verified,
      status,
      environment: {
        nodeEnv,
        salesEnabled,
        productSotActive,
      },
      database: {
        configuredPath,
        resolvedPath,
        filename: fileMeta.filename,
        exists: fileMeta.exists,
        sizeBytes: fileMeta.sizeBytes,
        modifiedAt: fileMeta.modifiedAt,
        sqlite: sqlite.connected,
        integrityCheck: sqlite.integrityCheck,
        journalMode: sqlite.journalMode,
        databaseList: sqlite.databaseList,
      },
      persistence: {
        persistent,
        mode,
        mountPath: MOUNT_PATH,
        mountExists: mount.exists,
        mountReadable: mount.readable,
        mountWritable: mount.writable,
        pathInsideMount: pathOnMount,
        diskMarker: {
          written: false,
          method: "access_only",
          present: mount.exists,
        },
      },
      backup: {
        configured: Boolean(env.BUZZARD_BACKUP_DIR),
        directory: backupResolved || backupConfigured,
        exists: backupInfo.exists,
        writable: backupInfo.writable,
      },
      safety: {
        readOnly: true,
        destructiveOperations: false,
        salesLocked: !salesEnabled,
        productSotLocked: !productSotActive,
      },
      verification: {
        status,
        checksPassed,
        checksFailed,
        reasons,
        verifiedAt,
        verificationId,
        correlationId,
      },
      runtimeProof: {
        verified: runtimeVerified,
        persistent,
        mode,
        dbPathVerified: pathOnMount,
        mountVerified: mount.exists && mount.directory,
        sqlitePathVerified: sqliteOnMount,
        integrityVerified: sqlite.integrityCheck === "ok",
      },
      redeployProof,
      reasons,
    };
  }

  return Object.freeze({
    verifyProductionDb,
    mountPath: MOUNT_PATH,
    expectedProductionDb: EXPECTED_PRODUCTION_DB,
    expectedProductionBackup: EXPECTED_PRODUCTION_BACKUP,
  });
}

function toPublicDbHealth(result) {
  return {
    ok: Boolean(result?.database?.sqlite) && Boolean(result?.safety?.salesLocked),
    database: {
      connected: Boolean(result?.database?.sqlite),
    },
    persistence: {
      persistent: Boolean(result?.persistence?.persistent),
      mode: result?.persistence?.mode || "unknown",
    },
    salesEnabled: Boolean(result?.environment?.salesEnabled),
  };
}

function toAdminVerification(result) {
  return {
    status: result.status,
    verificationId: result.verification.verificationId,
    correlationId: result.verification.correlationId,
    verifiedAt: result.verification.verifiedAt,
    reasons: result.reasons,
    runtimeProof: result.runtimeProof,
    redeployProof: result.redeployProof,
    environment: result.environment,
    database: result.database,
    persistence: result.persistence,
    backup: result.backup,
    safety: result.safety,
    verification: result.verification,
  };
}

function containsForbiddenPayload(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const lowered = text.toLowerCase();
  const needles = [
    "jwt_secret",
    "admin_password",
    "password_hash",
    "authorization: bearer",
    "customer_email",
    "card_number",
  ];
  return needles.some((n) => lowered.includes(n));
}

module.exports = {
  createProductionDbVerification,
  toPublicDbHealth,
  toAdminVerification,
  containsForbiddenPayload,
  MOUNT_PATH,
  EXPECTED_PRODUCTION_DB,
  EXPECTED_PRODUCTION_BACKUP,
};
