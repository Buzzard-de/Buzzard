import fs from "fs";
import path from "path";
import { getIsolatedPreflightDir } from "./varDataValidation";
import type { RestartPersistenceResult } from "./types";

const TEST_TABLE = "buzzard_preflight_restart_test";
const TEST_KEY = "preflight_marker";

function loadSqlite(): {
  new (p: string): {
    exec: (sql: string) => void;
    prepare: (sql: string) => { run: (...args: unknown[]) => void; get: (...args: unknown[]) => unknown };
    close: () => void;
  };
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("better-sqlite3");
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(path.join(process.cwd(), "server/node_modules/better-sqlite3"));
    } catch {
      return null;
    }
  }
}

/**
 * Isolated restart persistence test — uses temp DB only, never production tables.
 */
export function runRestartPersistenceTest(): RestartPersistenceResult {
  const Database = loadSqlite();
  const testDir = getIsolatedPreflightDir();
  const testDbPath = path.join(testDir, "restart-persistence-test.db");
  const marker = `preflight-${Date.now()}`;

  if (!Database) {
    return {
      status: "WARNING",
      testDbPath,
      writeOk: false,
      readOk: false,
      cleanupOk: false,
      notes: "better-sqlite3 unavailable — restart test skipped",
    };
  }

  let writeOk = false;
  let readOk = false;
  let cleanupOk = false;

  try {
    fs.mkdirSync(testDir, { recursive: true });
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

    const db1 = new Database(testDbPath);
    db1.exec(`CREATE TABLE IF NOT EXISTS ${TEST_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    db1.prepare(`INSERT OR REPLACE INTO ${TEST_TABLE} (key, value) VALUES (?, ?)`).run(TEST_KEY, marker);
    db1.close();
    writeOk = true;

    const db2 = new Database(testDbPath);
    const row = db2.prepare(`SELECT value FROM ${TEST_TABLE} WHERE key = ?`).get(TEST_KEY) as
      | { value?: string }
      | undefined;
    db2.close();
    readOk = row?.value === marker;

    fs.unlinkSync(testDbPath);
    cleanupOk = true;

    return {
      status: writeOk && readOk && cleanupOk ? "PASS" : "BLOCKED",
      testDbPath,
      writeOk,
      readOk,
      cleanupOk,
      notes:
        writeOk && readOk
          ? "Isolated write/reopen/read cycle passed (local temp DB)"
          : "Restart persistence cycle failed",
    };
  } catch (err) {
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
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
      notes: err instanceof Error ? err.message : "restart_test_failed",
    };
  }
}

export function getRenderRestartRequirement(varDataExists: boolean, persistenceMode: string): string | null {
  if (process.env.NODE_ENV === "production" && varDataExists && persistenceMode === "PERSISTENT") {
    return "MANUAL_RENDER_RESTART_REQUIRED — verify persistence after deploy/restart on Render instance";
  }
  if (process.env.NODE_ENV === "production" && !varDataExists) {
    return "MANUAL_RENDER_RESTART_REQUIRED — mount disk first, then deploy and verify /api/health/db";
  }
  return null;
}
