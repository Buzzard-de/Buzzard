/**
 * Part 17 — Restore safety: VALIDATE → REVIEW → EXPLICIT ACTION
 * Never auto-overwrite production.
 */
const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const root = path.join(__dirname, "..", "..");
const serverRequire = createRequire(path.join(root, "server", "package.json"));

function loadSqlite() {
  try {
    return serverRequire("better-sqlite3");
  } catch {
    return require("better-sqlite3");
  }
}

function validateBackupFile(sourcePath) {
  const issues = [];
  if (!sourcePath) {
    return { ok: false, phase: "VALIDATE", issues: ["SOURCE_PATH_REQUIRED"] };
  }
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, phase: "VALIDATE", issues: ["BACKUP_NOT_FOUND"] };
  }

  const stat = fs.statSync(sourcePath);
  if (stat.size < 1024) {
    issues.push("BACKUP_TOO_SMALL");
  }

  let integrityCheck = "unknown";
  try {
    const Database = loadSqlite();
    const db = new Database(sourcePath, { readonly: true });
    const row = db.prepare("PRAGMA integrity_check").get();
    integrityCheck = row?.integrity_check || "unknown";
    db.close();
  } catch (err) {
    issues.push(`INTEGRITY_ERROR:${err.message}`);
  }

  if (integrityCheck !== "ok") {
    issues.push(`INTEGRITY_FAILED:${integrityCheck}`);
  }

  const metaPath = `${sourcePath}.meta.json`;
  let meta = null;
  if (fs.existsSync(metaPath)) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      issues.push("META_PARSE_FAILED");
    }
  }

  return {
    ok: issues.length === 0,
    phase: "VALIDATE",
    sourcePath,
    sizeBytes: stat.size,
    integrityCheck,
    meta,
    issues,
    requiresReview: true,
    requiresExplicitAction: true,
  };
}

function reviewRestorePlan({ sourcePath, targetPath, environment = process.env.NODE_ENV }) {
  const validation = validateBackupFile(sourcePath);
  const isProduction = environment === "production" || String(targetPath).startsWith("/var/data");

  return {
    phase: "REVIEW",
    validation,
    targetPath,
    isProduction,
    allowed: validation.ok && (!isProduction || process.env.BUZZARD_ALLOW_PRODUCTION_RESTORE === "1"),
    steps: [
      "1. VALIDATE backup integrity (automatic)",
      "2. REVIEW target path and environment",
      "3. EXPLICIT ACTION: set BUZZARD_ALLOW_PRODUCTION_RESTORE=1 for production targets",
      "4. Run: node scripts/restore-db.mjs --from <backup> [--dry-run first]",
    ],
    autoRestore: false,
  };
}

function assertRestoreAllowed({ sourcePath, targetPath }) {
  const plan = reviewRestorePlan({ sourcePath, targetPath });
  if (!plan.validation.ok) {
    const err = new Error(`Restore validation failed: ${plan.validation.issues.join(", ")}`);
    err.code = "restore_validation_failed";
    throw err;
  }
  if (!plan.allowed) {
    const err = new Error("Restore blocked — explicit production approval required");
    err.code = "restore_blocked";
    err.details = plan;
    throw err;
  }
  return plan;
}

module.exports = {
  validateBackupFile,
  reviewRestorePlan,
  assertRestoreAllowed,
};
