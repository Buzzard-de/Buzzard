#!/usr/bin/env node
/**
 * Regenerates category audit preview after audit_policy.json changes.
 * Run from repo root: node scripts/refresh-category-audit-preview.mjs
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "python3",
  ["main.py", "complete-category-audit-sync"],
  { cwd: path.join(root, "intelligence"), encoding: "utf8" }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

console.log(result.stdout.trim());
