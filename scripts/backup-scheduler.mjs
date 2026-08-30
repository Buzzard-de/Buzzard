#!/usr/bin/env node
/**
 * Part 16 — Scheduled backup runner with retention policy.
 * Safe to run via cron: BUZZARD_BACKUP_DIR=/var/data/backups node scripts/backup-scheduler.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const backupAutomation = require("../server/lib/backupAutomation.js");

async function main() {
  console.log("=== BUZZARD BACKUP SCHEDULER ===");
  const readiness = backupAutomation.getBackupReadiness();
  console.log(JSON.stringify({ readiness }, null, 2));

  const result = backupAutomation.runBackup({ applyRetentionPolicy: true });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("backup-scheduler failed:", err.message);
  process.exit(1);
});
