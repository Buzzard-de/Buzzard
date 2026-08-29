/**
 * Part 13 — Database startup validation (production-safe persistence)
 */
const fs = require("fs");
const path = require("path");
const { resolveDbPath, getPersistenceInfo, ensureDbDirectory, defaultDbPath } = require("./dbPaths");
const { runIntegrityCheck } = require("./dbIntegrity");

let startupResult = null;

/** One-time copy when persistent disk is first mounted (Render /var/data). */
function migrateEphemeralToPersistentIfNeeded(targetPath) {
  if (!targetPath.startsWith("/var/data")) return null;
  if (fs.existsSync(targetPath)) return null;

  const legacyPath = path.resolve(defaultDbPath);
  if (legacyPath === path.resolve(targetPath)) return null;
  if (!fs.existsSync(legacyPath)) return null;

  try {
    const stat = fs.statSync(legacyPath);
    if (!stat.isFile() || stat.size === 0) return null;
    fs.copyFileSync(legacyPath, targetPath);
    console.log(`[db-startup] Migrated SQLite ${legacyPath} → ${targetPath}`);
    return { from: legacyPath, to: targetPath, bytes: stat.size };
  } catch (err) {
    console.warn("[db-startup] Ephemeral→persistent migration skipped:", err.message);
    return null;
  }
}

function validateDatabaseStartup() {
  const dbPath = resolveDbPath();

  try {
    ensureDbDirectory(dbPath);
  } catch (err) {
    // continue — errors collected below
  }

  const migration = migrateEphemeralToPersistentIfNeeded(dbPath);
  const persistence = getPersistenceInfo(dbPath);
  const errors = [];
  const warnings = [];

  try {
    ensureDbDirectory(dbPath);
  } catch (err) {
    errors.push(`Cannot create DB directory: ${err.message}`);
  }

  const dir = require("path").dirname(dbPath);
  try {
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    errors.push(`Database directory not writable: ${dir}`);
  }

  if (process.env.NODE_ENV === "production" && !persistence.persistent) {
    const msg =
      "Production without persistent disk — set BUZZARD_DB_PATH=/var/data/buzzard.db (catalog mode allows ephemeral on Render free tier)";
    if (process.env.REQUIRE_PERSISTENT_DB === "1" || process.env.BUZZARD_SALES_ENABLED === "1") {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  if (persistence.ephemeralRisk) {
    warnings.push(persistence.ephemeralRisk);
  }

  let integrity = { status: "UNKNOWN" };
  try {
    integrity = runIntegrityCheck();
    if (integrity.status === "FAILED") {
      errors.push(`SQLite integrity_check failed: ${integrity.integrityCheck}`);
    } else if (integrity.status === "DEGRADED") {
      warnings.push(`Missing critical tables: ${integrity.missingCritical.join(", ")}`);
    }
  } catch (err) {
    errors.push(`Database integrity check error: ${err.message}`);
  }

  startupResult = {
    ok: errors.length === 0,
    dbPath,
    persistence,
    migration,
    integrity,
    errors,
    warnings,
    validatedAt: new Date().toISOString(),
  };

  if (errors.length) {
    console.error("[db-startup] errors:", errors.join("; "));
  }
  for (const w of warnings) {
    console.warn("[db-startup]", w);
  }

  if (process.env.NODE_ENV === "production" && errors.length > 0) {
    throw new Error(`Database startup validation failed: ${errors.join("; ")}`);
  }

  return startupResult;
}

function getDatabaseStartupStatus() {
  return startupResult || { ok: null, message: "not_validated_yet" };
}

module.exports = {
  validateDatabaseStartup,
  getDatabaseStartupStatus,
};
