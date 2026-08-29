/**
 * Part 12 — Central SQLite path configuration
 */
const fs = require("fs");
const path = require("path");

const serverDataDir = path.join(__dirname, "..", "data");
const defaultDbPath = path.join(serverDataDir, "buzzard.db");
const defaultBackupDir = path.join(serverDataDir, "backups");

function resolveDbPath() {
  if (process.env.BUZZARD_DB_PATH) {
    return path.resolve(process.env.BUZZARD_DB_PATH);
  }
  return defaultDbPath;
}

function resolveBackupDir() {
  if (process.env.BUZZARD_BACKUP_DIR) {
    return path.resolve(process.env.BUZZARD_BACKUP_DIR);
  }
  return defaultBackupDir;
}

function ensureDbDirectory(dbPath = resolveDbPath()) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}

function getRenderDiskDiagnostics() {
  const mountPath = "/var/data";
  let exists = false;
  let writable = false;
  try {
    exists = fs.existsSync(mountPath);
    if (exists) {
      fs.accessSync(mountPath, fs.constants.W_OK);
      writable = true;
    }
  } catch {
    writable = false;
  }
  return {
    mountPath,
    exists,
    writable,
    envBuzzardDbPath: process.env.BUZZARD_DB_PATH || null,
    envBuzzardBackupDir: process.env.BUZZARD_BACKUP_DIR || null,
  };
}

function getPersistenceInfo(dbPath = resolveDbPath()) {
  const isProduction = process.env.NODE_ENV === "production";
  const onRenderDisk = dbPath.startsWith("/var/data");
  const customPath = Boolean(process.env.BUZZARD_DB_PATH);
  const persistent = onRenderDisk || (customPath && !dbPath.includes("/tmp"));
  const ephemeralRisk =
    isProduction && !persistent
      ? "Production without persistent disk — SQLite data lost on redeploy"
      : null;

  let mode = "development_default";
  if (onRenderDisk) mode = "render_persistent_disk";
  else if (customPath) mode = "custom_path";
  else if (isProduction) mode = "production_ephemeral";

  const disk = getRenderDiskDiagnostics();
  let syncHint = null;
  if (isProduction && !persistent) {
    if (disk.exists && !disk.envBuzzardDbPath) {
      syncHint =
        "Disk /var/data is mounted but BUZZARD_DB_PATH is missing — set env and redeploy buzzard-api";
    } else if (!disk.exists && !disk.envBuzzardDbPath) {
      syncHint =
        "No /var/data mount and no BUZZARD_DB_PATH — Blueprint sync may be pending or not applied to buzzard-api";
    } else if (disk.envBuzzardDbPath && !onRenderDisk) {
      syncHint = "BUZZARD_DB_PATH is set but DB still on default path — redeploy buzzard-api";
    }
  }

  return {
    path: dbPath,
    mode,
    persistent,
    ephemeralRisk,
    backupDir: resolveBackupDir(),
    env: process.env.NODE_ENV || "development",
    renderDisk: disk,
    syncHint,
  };
}

module.exports = {
  serverDataDir,
  defaultDbPath,
  defaultBackupDir,
  resolveDbPath,
  resolveBackupDir,
  ensureDbDirectory,
  getRenderDiskDiagnostics,
  getPersistenceInfo,
};
