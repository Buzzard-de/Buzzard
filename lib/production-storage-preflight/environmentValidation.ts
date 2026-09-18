import type { EnvVarCheck, PersistenceMode } from "./types";

const CANONICAL_MOUNT = "/var/data";
const CANONICAL_DB_PATH = "/var/data/buzzard.db";

function envHint(name: string): string {
  const val = process.env[name];
  if (!val?.trim()) return "NOT_SET";
  if (name.includes("SECRET") || name.includes("PASSWORD") || name.includes("TOKEN")) {
    return "CONFIGURED";
  }
  if (val.startsWith("/")) return val;
  if (val.length > 40) return "CONFIGURED";
  return val;
}

export function checkEnvironmentVariables(): EnvVarCheck[] {
  const vars = [
    "BUZZARD_DB_PATH",
    "BUZZARD_BACKUP_DIR",
    "PERSISTENT_DATA_PATH",
    "SQLITE_PATH",
    "DATABASE_PATH",
    "DATA_DIR",
    "NODE_ENV",
    "REQUIRE_PERSISTENT_DB",
  ];
  return vars.map((name) => ({
    name,
    configured: Boolean(process.env[name]?.trim()),
    valueHint: envHint(name),
  }));
}

/**
 * Resolve persistence mode from existing Buzzard env SSOT (BUZZARD_DB_PATH primary).
 * Does not invent new env keys — extends validation only.
 */
export function resolvePersistenceMode(): PersistenceMode {
  const dbPath =
    process.env.BUZZARD_DB_PATH?.trim() ||
    process.env.SQLITE_PATH?.trim() ||
    process.env.DATABASE_PATH?.trim() ||
    "";
  const isProduction = process.env.NODE_ENV === "production";

  if (dbPath.startsWith(CANONICAL_MOUNT)) return "PERSISTENT";
  if (dbPath && !dbPath.includes("/tmp")) return "PERSISTENT";
  if (isProduction) return "EPHEMERAL";
  return "DEVELOPMENT";
}

export function resolveEffectiveDbPath(): string {
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

export function isPersistenceConfigured(): boolean {
  const mode = resolvePersistenceMode();
  const dbPath = resolveEffectiveDbPath();
  return mode === "PERSISTENT" || dbPath.startsWith(CANONICAL_MOUNT);
}

export { CANONICAL_MOUNT, CANONICAL_DB_PATH };
