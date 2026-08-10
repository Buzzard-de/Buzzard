#!/usr/bin/env node
/**
 * Backup Buzzard SQLite database to a timestamped file.
 *
 * Usage:
 *   node scripts/db-backup.mjs
 *   BUZZARD_DB_PATH=/var/data/buzzard.db node scripts/db-backup.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.BUZZARD_DB_PATH
  ? path.resolve(process.env.BUZZARD_DB_PATH)
  : path.join(root, "server", "data", "buzzard.db");
const backupDir = process.env.BUZZARD_BACKUP_DIR
  ? path.resolve(process.env.BUZZARD_BACKUP_DIR)
  : path.join(root, "server", "data", "backups");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `buzzard-${stamp}.db`);
fs.copyFileSync(dbPath, target);

const stat = fs.statSync(target);
console.log(`Backup created: ${target} (${stat.size} bytes)`);
