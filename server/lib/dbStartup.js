/**
 * Part 13 — Database startup validation (production-safe persistence)
 */
const fs = require("fs");
const path = require("path");
const { resolveDbPath, getPersistenceInfo, ensureDbDirectory, defaultDbPath, assertDurableOpenAllowed } = require("./dbPaths");
const { runIntegrityCheck } = require("./dbIntegrity");
const { publicTaskError } = require("./security");

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
    console.log("[db-startup] Migrated SQLite ephemeral→persistent");
    return { from: "ephemeral", to: "persistent", bytes: stat.size };
  } catch (err) {
    console.warn("[db-startup] Ephemeral→persistent migration skipped:", publicTaskError(err, "database.migration_skipped"));
    return null;
  }
}

function validateDatabaseStartup() {
  const dbPath = resolveDbPath();
  const errors = [];
  const warnings = [];

  try {
    assertDurableOpenAllowed({ dbPath });
  } catch (err) {
    errors.push(publicTaskError(err, "database.open_refused"));
    startupResult = {
      ok: false,
      dbPath,
      persistence: getPersistenceInfo(dbPath),
      migration: null,
      integrity: { status: "NOT_OPENED" },
      errors,
      warnings,
      validatedAt: new Date().toISOString(),
    };
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
    return startupResult;
  }

  try {
    ensureDbDirectory(dbPath);
  } catch (err) {
    errors.push(publicTaskError(err, "database.directory_create_failed"));
  }

  const migration = migrateEphemeralToPersistentIfNeeded(dbPath);
  const persistence = getPersistenceInfo(dbPath);

  const dir = require("path").dirname(dbPath);
  try {
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    errors.push("database.directory_unwritable");
  }

  if (process.env.NODE_ENV === "production" && !process.env.BUZZARD_DB_PATH) {
    errors.push(
      "Production BUZZARD_DB_PATH is unset — refusing to use the local default database as production storage"
    );
  } else if (process.env.NODE_ENV === "production" && !persistence.persistent) {
    errors.push(
      "Production database path is not persistent — set BUZZARD_DB_PATH to the Render disk mount (typically /var/data/buzzard.db)"
    );
  }

  if (persistence.ephemeralRisk) {
    warnings.push(persistence.ephemeralRisk);
  }

  let integrity = { status: "UNKNOWN" };
  try {
    integrity = runIntegrityCheck();
    if (integrity.status === "FAILED") {
      errors.push(publicTaskError({ error: integrity.integrityCheck }, "database.integrity_failed"));
    } else if (integrity.status === "DEGRADED") {
      warnings.push(`Missing critical tables: ${integrity.missingCritical.join(", ")}`);
    }
  } catch (err) {
    errors.push(publicTaskError(err, "database.integrity_check_failed"));
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
