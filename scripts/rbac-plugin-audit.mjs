#!/usr/bin/env node
/**
 * RBAC plugin audit — scans server/plugins for auth helper usage.
 * Usage: node scripts/rbac-plugin-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginsDir = path.join(__dirname, "..", "server", "plugins");

const PATTERNS = [
  { name: "requireAnyAdmin", re: /requireAnyAdmin\s*\(/g },
  { name: "requireAdmin", re: /requireAdmin\s*\(/g },
  { name: "requirePermission", re: /requirePermission\s*\(/g },
  { name: "requireRole", re: /requireRole\s*\(/g },
  { name: "requireAuth", re: /requireAuth\s*\(/g },
  { name: "attachAdmin", re: /attachAdmin\s*\(/g },
  { name: "adminGuard", re: /adminGuard|lib\/adminGuard/g },
];

const files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith(".js"));
const report = [];

for (const file of files) {
  const full = path.join(pluginsDir, file);
  const content = fs.readFileSync(full, "utf8");
  const hits = {};
  for (const { name, re } of PATTERNS) {
    const matches = content.match(re);
    if (matches) hits[name] = matches.length;
  }
  if (Object.keys(hits).length) {
    report.push({ file, hits });
  }
}

console.log(`RBAC Plugin Audit — ${files.length} plugins scanned\n`);
for (const row of report.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`${row.file}`);
  for (const [k, v] of Object.entries(row.hits)) {
    console.log(`  ${k}: ${v}`);
  }
}

const duplicateAnyAdmin = report.filter((r) => r.hits.requireAnyAdmin);
console.log(`\nSummary:`);
console.log(`  Plugins with local auth: ${report.length}`);
console.log(`  requireAnyAdmin usage: ${duplicateAnyAdmin.length} (global middleware also applies)`);
console.log(`  Recommendation: prefer adminGuard.js for new routes; legacy attachAdmin+requirePerm OK.`);

process.exit(0);
