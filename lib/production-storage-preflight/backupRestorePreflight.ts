import fs from "fs";
import path from "path";
import { runBackupRestoreValidation } from "@/lib/final-closure/backupRestore";
import { resolveEffectiveDbPath } from "./environmentValidation";
import type { BackupRestorePreflight } from "./types";

export function checkBackupRestorePreflight(): BackupRestorePreflight {
  const root = process.cwd();
  const backupScript = path.join(root, "scripts/db-backup.mjs");
  const restoreScript = path.join(root, "scripts/restore-db.mjs");
  const backupScriptPresent = fs.existsSync(backupScript);
  const restoreScriptPresent = fs.existsSync(restoreScript);

  const backupDir =
    process.env.BUZZARD_BACKUP_DIR?.trim() ||
    path.join(root, "server/data/backups");
  const backupDirExists = fs.existsSync(backupDir);
  let backupAvailable = false;
  if (backupDirExists) {
    try {
      const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".db"));
      backupAvailable = files.length > 0;
    } catch {
      backupAvailable = false;
    }
  }

  const restoreProcedureDocumented =
    fs.existsSync(path.join(root, "docs/DB_PERSISTENCE_RENDER_DE.md")) &&
    fs.existsSync(restoreScript);

  let restoreEvidence: BackupRestorePreflight["restoreEvidence"] = "UNVERIFIED";
  try {
    const evidence = runBackupRestoreValidation();
    if (evidence.result === "PASS") restoreEvidence = "PASS";
    else if (evidence.result === "BLOCKED") restoreEvidence = "BLOCKED";
    else restoreEvidence = "UNVERIFIED";
  } catch {
    restoreEvidence = "UNVERIFIED";
  }

  const onRenderProduction =
    process.env.NODE_ENV === "production" && resolveEffectiveDbPath().startsWith("/var/data");
  if (onRenderProduction && restoreEvidence !== "PASS") {
    restoreEvidence = "UNVERIFIED";
  }

  let status: BackupRestorePreflight["status"] = "PASS";
  if (!backupScriptPresent || !restoreScriptPresent) status = "BLOCKED";
  else if (restoreEvidence === "UNVERIFIED") status = "UNVERIFIED";
  else if (!backupDirExists) status = "WARNING";

  const notes: string[] = [];
  if (restoreEvidence === "UNVERIFIED") {
    notes.push("RESTORE_EVIDENCE=UNVERIFIED on production Render until live backup/restore verified");
  }
  if (!backupAvailable) {
    notes.push("No backup files found in backup directory");
  }

  return {
    backupScriptPresent,
    restoreScriptPresent,
    backupDir,
    backupDirExists,
    backupAvailable,
    restoreProcedureDocumented,
    restoreEvidence,
    integrityCheckSupported: backupScriptPresent && restoreScriptPresent,
    status,
    notes: notes.join("; ") || "Backup/restore scripts present",
  };
}
