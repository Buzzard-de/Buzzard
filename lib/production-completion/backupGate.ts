import { existsSync } from "fs";
import path from "path";
import type { CompletionSectionReport } from "./types";

export function evaluateBackupGate(): CompletionSectionReport {
  const blockers: CompletionSectionReport["blockers"] = [];
  const scripts = ["scripts/db-backup.mjs", "scripts/backup-db.mjs", "scripts/restore-db.mjs"];
  const dbPath = path.join(process.cwd(), "server/data/buzzard.db");

  for (const s of scripts) {
    if (!existsSync(path.join(process.cwd(), s))) {
      blockers.push({
        code: "BACKUP_SCRIPT_MISSING",
        severity: "HIGH",
        description: `Backup script missing: ${s}`,
        resolution: "Restore backup script",
        status: "BLOCKED",
      });
    }
  }

  if (!existsSync(dbPath)) {
    blockers.push({
      code: "DATABASE_NOT_FOUND",
      severity: "MEDIUM",
      description: "Production SQLite database not found for backup verification",
      resolution: "Initialize database or run in deployment environment",
      status: "UNVERIFIED",
    });
  }

  const status = blockers.some((b) => b.severity === "CRITICAL" || b.severity === "HIGH" && b.status === "BLOCKED")
    ? "BLOCKED"
    : blockers.length > 0
      ? "UNVERIFIED"
      : "PASS";

  return {
    section: "BACKUP",
    status,
    message: status === "PASS" ? "Backup scripts available" : "Backup verification incomplete",
    blockers,
  };
}
