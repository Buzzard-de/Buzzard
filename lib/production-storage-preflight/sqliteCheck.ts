import fs from "fs";
import path from "path";
import { resolveEffectiveDbPath } from "./environmentValidation";
import type { SqliteConfigCheck } from "./types";

function loadSqlite(): {
  new (p: string, opts?: { readonly?: boolean }): {
    prepare: (sql: string) => { get: () => unknown; all: () => unknown[] };
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

export function checkSqliteConfiguration(usePath?: string): SqliteConfigCheck {
  const databasePath = path.resolve(usePath ?? resolveEffectiveDbPath());
  const fileExists = fs.existsSync(databasePath);
  const Database = loadSqlite();

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
      status: "WARNING",
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
      status: "UNVERIFIED",
    };
  }

  try {
    const db = new Database(databasePath, { readonly: true });
    const journalRow = db.prepare("PRAGMA journal_mode").get() as { journal_mode?: string } | undefined;
    const fkRow = db.prepare("PRAGMA foreign_keys").get() as { foreign_keys?: number } | undefined;
    const busyRow = db.prepare("PRAGMA busy_timeout").get() as { busy_timeout?: number } | undefined;
    const integrityRow = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string } | undefined;
    const userVersion = db.prepare("PRAGMA user_version").get() as { user_version?: number } | undefined;

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
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
      status: integrityOk ? (migrationReady ? "PASS" : "WARNING") : "BLOCKED",
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
      status: "BLOCKED",
    };
  }
}
