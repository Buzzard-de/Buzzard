#!/usr/bin/env node
/**
 * Part 12 — Restore SQLite backup with production safety guard
 *
 * Usage:
 *   node scripts/restore-db.mjs --from server/data/backups/buzzard-2026-01-01.db
 *   BUZZARD_ALLOW_PRODUCTION_RESTORE=1 node scripts/restore-db.mjs --from ./backup.db
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
const sourceArg = fromIdx >= 0 ? args[fromIdx + 1] : null;
const dryRun = args.includes("--dry-run");

if (!sourceArg) {
  console.error("Usage: node scripts/restore-db.mjs --from <backup.db> [--dry-run]");
  process.exit(1);
}

const source = path.resolve(sourceArg);
const dbPath = process.env.BUZZARD_DB_PATH
  ? path.resolve(process.env.BUZZARD_DB_PATH)
  : path.join(root, "server", "data", "buzzard.db");

const isProduction = process.env.NODE_ENV === "production";
const onRenderDisk = dbPath.startsWith("/var/data");
const productionTarget = isProduction || onRenderDisk;

if (productionTarget && process.env.BUZZARD_ALLOW_PRODUCTION_RESTORE !== "1") {
  console.error(
    "Refusing restore to production target without BUZZARD_ALLOW_PRODUCTION_RESTORE=1"
  );
  console.error(`Target: ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(source)) {
  console.error(`Backup not found: ${source}`);
  process.exit(1);
}

const stat = fs.statSync(source);
if (stat.size < 1024) {
  console.error("Backup file suspiciously small — aborting");
  process.exit(1);
}

if (dryRun) {
  console.log(`[dry-run] Would restore ${source} (${stat.size} bytes) → ${dbPath}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const preRestore = `${dbPath}.pre-restore-${Date.now()}`;
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, preRestore);
  console.log(`Pre-restore snapshot: ${preRestore}`);
}

fs.copyFileSync(source, dbPath);
console.log(`Restored ${source} → ${dbPath} (${stat.size} bytes)`);
console.log("Restart API and run: npm run test:smoke && npm run test:production-safety");
