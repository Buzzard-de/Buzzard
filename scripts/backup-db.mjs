#!/usr/bin/env node
/**
 * Part 12 — SQLite backup (alias of db-backup with persistence metadata)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("node", ["scripts/db-backup.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
