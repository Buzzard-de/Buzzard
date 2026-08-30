/**
 * Part 16 — Backup automation service (local persistent path, no external storage required).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DEFAULT_BACKUP_DIR = process.env.BUZZARD_BACKUP_DIR || "/var/data/backups";
const RETENTION_DAYS = Number(process.env.BUZZARD_BACKUP_RETENTION_DAYS) || 14;
const RETENTION_MIN_COUNT = Number(process.env.BUZZARD_BACKUP_MIN_KEEP) || 3;

function resolveBackupDir() {
  const dir = path.resolve(DEFAULT_BACKUP_DIR);
  return dir;
}

function listBackups(backupDir = resolveBackupDir()) {
  if (!fs.existsSync(backupDir)) {
    return { ok: false, backups: [], error: "backup_dir_missing", path: backupDir };
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("buzzard-") && f.endsWith(".db"))
    .map((name) => {
      const full = path.join(backupDir, name);
      const stat = fs.statSync(full);
      const metaPath = `${full}.meta.json`;
      let meta = null;
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        } catch {
          meta = null;
        }
      }
      return {
        name,
        path: full,
        sizeBytes: stat.size,
        mtime: stat.mtime.toISOString(),
        integrityCheck: meta?.integrityCheck || "unknown",
        success: meta?.success ?? null,
      };
    })
    .sort((a, b) => (a.mtime < b.mtime ? 1 : -1));

  return { ok: true, path: backupDir, backups: files, count: files.length };
}

function validateLatestBackup(backupDir = resolveBackupDir()) {
  const listing = listBackups(backupDir);
  if (!listing.ok || listing.backups.length === 0) {
    return { ok: false, status: "NO_BACKUPS", path: backupDir };
  }
  const latest = listing.backups[0];
  const valid = latest.integrityCheck === "ok" && latest.success !== false;
  return {
    ok: valid,
    status: valid ? "OK" : "INVALID",
    latest,
    path: backupDir,
  };
}

function applyRetention(backupDir = resolveBackupDir()) {
  const listing = listBackups(backupDir);
  if (!listing.ok) return { removed: [], kept: [], skipped: true };

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const removed = [];
  const kept = [];

  listing.backups.forEach((backup, index) => {
    const isRecent = new Date(backup.mtime).getTime() >= cutoff;
    const isProtected = index < RETENTION_MIN_COUNT;
    if (isRecent || isProtected) {
      kept.push(backup.name);
      return;
    }
    try {
      fs.unlinkSync(backup.path);
      const meta = `${backup.path}.meta.json`;
      if (fs.existsSync(meta)) fs.unlinkSync(meta);
      removed.push(backup.name);
    } catch {
      kept.push(backup.name);
    }
  });

  return { removed, kept, retentionDays: RETENTION_DAYS, minKeep: RETENTION_MIN_COUNT };
}

function runBackup({ applyRetentionPolicy = true } = {}) {
  const backupDir = resolveBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });

  const script = path.join(__dirname, "..", "..", "scripts", "db-backup.mjs");
  let result;
  try {
    const output = execSync(`node "${script}"`, {
      env: { ...process.env, BUZZARD_BACKUP_DIR: backupDir },
      encoding: "utf8",
    });
    result = JSON.parse(output.trim().split("\n").pop());
  } catch (err) {
    return { ok: false, error: err.message, path: backupDir };
  }

  let retention = null;
  if (applyRetentionPolicy) {
    retention = applyRetention(backupDir);
  }

  return {
    ok: result.ok === true,
    backup: result,
    retention,
    path: backupDir,
  };
}

function getBackupReadiness() {
  const dir = resolveBackupDir();
  const exists = fs.existsSync(dir);
  const validation = validateLatestBackup(dir);
  return {
    backupDir: dir,
    dirExists: exists,
    latestValid: validation.ok,
    latestStatus: validation.status,
    retentionDays: RETENTION_DAYS,
    minKeep: RETENTION_MIN_COUNT,
    schedulerEnv: process.env.BUZZARD_BACKUP_CRON || null,
    recommendation: "Schedule `node scripts/db-backup.mjs` via Render cron or BUZZARD_BACKUP_CRON when persistent disk is active.",
  };
}

module.exports = {
  resolveBackupDir,
  listBackups,
  validateLatestBackup,
  applyRetention,
  runBackup,
  getBackupReadiness,
};
