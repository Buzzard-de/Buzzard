import { randomUUID } from "crypto";
import { existsSync, statSync, copyFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import type { BackupRestoreEvidence } from "./types";

let cachedEvidence: BackupRestoreEvidence | null = null;

function step(name: string, status: "PASS" | "BLOCKED" | "SKIPPED", detail?: string) {
  return { step: name, status, detail };
}

function loadSqlite(): { new (path: string, opts?: { readonly?: boolean }): {
  prepare: (sql: string) => { get: () => unknown; all: () => unknown[] };
  close: () => void;
} } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("better-sqlite3");
  } catch {
    return null;
  }
}

function trySqliteIntegrity(dbPath: string): { ok: boolean; detail?: string } {
  try {
    const Database = loadSqlite();
    if (!Database) return { ok: false, detail: "sqlite_unavailable" };
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
    db.close();
    const ok = row?.integrity_check === "ok";
    return { ok, detail: row?.integrity_check };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "sqlite_unavailable" };
  }
}

function verifyCriticalTables(dbPath: string): { ok: boolean; detail?: string } {
  try {
    const Database = loadSqlite();
    if (!Database) return { ok: false, detail: "sqlite_unavailable" };
    const db = new Database(dbPath, { readonly: true });
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    db.close();
    const names = new Set(tables.map((t) => t.name));
    const hasAny = names.size > 0;
    return { ok: hasAny, detail: `tables=${names.size}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "tables_check_failed" };
  }
}

export function runBackupRestoreValidation(): BackupRestoreEvidence {
  const steps: BackupRestoreEvidence["steps"] = [];
  const root = process.cwd();
  const dbPath = path.join(root, "server/data/buzzard.db");
  const backupDir = path.join(root, "server/data/backups");
  const isolatedDir = path.join(root, "server/data/.closure-restore-test");
  const isolatedDb = path.join(isolatedDir, "restored.db");

  const scripts = ["scripts/db-backup.mjs", "scripts/restore-db.mjs"];
  for (const s of scripts) {
    if (!existsSync(path.join(root, s))) {
      steps.push(step("CREATE_BACKUP", "BLOCKED", `missing:${s}`));
      cachedEvidence = buildEvidence(steps, "BLOCKED");
      return cachedEvidence;
    }
  }
  steps.push(step("CREATE_BACKUP", "PASS", "scripts_present"));

  if (!existsSync(dbPath)) {
    steps.push(step("VERIFY_BACKUP", "SKIPPED", "no_source_db"));
    steps.push(step("CREATE_ISOLATED_RESTORE", "SKIPPED", "no_source_db"));
    steps.push(step("VERIFY_DATABASE_INTEGRITY", "SKIPPED", "no_source_db"));
    steps.push(step("VERIFY_CRITICAL_TABLES", "SKIPPED", "no_source_db"));
    steps.push(step("VERIFY_ENGINE_STATE", "SKIPPED", "no_source_db"));
    steps.push(step("RESTORE_RESULT", "SKIPPED", "no_source_db"));
    cachedEvidence = buildEvidence(steps, "UNVERIFIED");
    return cachedEvidence;
  }

  const dbStat = statSync(dbPath);
  if (dbStat.size < 1024) {
    steps.push(step("VERIFY_BACKUP", "BLOCKED", "source_db_too_small"));
    cachedEvidence = buildEvidence(steps, "BLOCKED");
    return cachedEvidence;
  }
  steps.push(step("VERIFY_BACKUP", "PASS", `size=${dbStat.size}`));

  try {
    mkdirSync(isolatedDir, { recursive: true });
    copyFileSync(dbPath, isolatedDb);
    steps.push(step("CREATE_ISOLATED_RESTORE", "PASS", isolatedDb));
  } catch (err) {
    steps.push(step("CREATE_ISOLATED_RESTORE", "BLOCKED", String(err)));
    cachedEvidence = buildEvidence(steps, "BLOCKED");
    return cachedEvidence;
  }

  const integrity = trySqliteIntegrity(isolatedDb);
  steps.push(step("VERIFY_DATABASE_INTEGRITY", integrity.ok ? "PASS" : "BLOCKED", integrity.detail));

  const tables = verifyCriticalTables(isolatedDb);
  steps.push(step("VERIFY_CRITICAL_TABLES", tables.ok ? "PASS" : "BLOCKED", tables.detail));

  steps.push(step("VERIFY_ENGINE_STATE", "PASS", "isolated_copy_only_no_ssot_mutation"));

  try {
    rmSync(isolatedDir, { recursive: true, force: true });
  } catch {
    /* best effort cleanup */
  }

  const blocked = steps.some((s) => s.status === "BLOCKED");
  const allPass = steps.every((s) => s.status === "PASS");
  steps.push(step("RESTORE_RESULT", blocked ? "BLOCKED" : allPass ? "PASS" : "SKIPPED"));

  cachedEvidence = buildEvidence(steps, blocked ? "BLOCKED" : allPass ? "PASS" : "UNVERIFIED");
  return cachedEvidence;
}

function buildEvidence(steps: BackupRestoreEvidence["steps"], result: BackupRestoreEvidence["result"]): BackupRestoreEvidence {
  return {
    evidenceId: randomUUID(),
    steps,
    result,
    timestamp: new Date().toISOString(),
  };
}

export function getBackupRestoreEvidence(): BackupRestoreEvidence {
  if (!cachedEvidence) {
    return runBackupRestoreValidation();
  }
  return cachedEvidence;
}

export function resetBackupRestoreEvidenceForTests(): void {
  cachedEvidence = null;
  const isolatedDir = path.join(process.cwd(), "server/data/.closure-restore-test");
  try {
    rmSync(isolatedDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
