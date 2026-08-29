#!/usr/bin/env node
/**
 * Part 13 — Production-safe SQLite backup with metadata sidecar
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
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
const metaPath = `${target}.meta.json`;

fs.copyFileSync(dbPath, target);
const stat = fs.statSync(target);

let integrityCheck = "skipped";
try {
  const Database = require("better-sqlite3");
  const backupDb = new Database(target, { readonly: true });
  const row = backupDb.prepare("PRAGMA integrity_check").get();
  integrityCheck = row?.integrity_check || "unknown";
  backupDb.close();
} catch (err) {
  integrityCheck = `error:${err.message}`;
}

const meta = {
  timestamp: new Date().toISOString(),
  sourcePath: dbPath,
  backupPath: target,
  sizeBytes: stat.size,
  integrityCheck,
  success: integrityCheck === "ok",
  environment: process.env.NODE_ENV || "development",
};

fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
console.log(JSON.stringify({ ok: meta.success, backup: target, meta }, null, 2));
process.exit(meta.success ? 0 : 1);
