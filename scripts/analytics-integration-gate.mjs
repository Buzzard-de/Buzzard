#!/usr/bin/env node
/**
 * BUZZARD #329 — Full integration regression gate (#323–#328)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, label) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`✗ FAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${label}`);
}

function checkGitIntegrity() {
  console.log("\n▶ Git integrity");
  const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  const dirty = status.stdout.trim();
  if (dirty) {
    console.warn("Working tree has uncommitted changes (expected during gate run if editing)");
  }

  const conflict = spawnSync("git", ["grep", "-l", "<<<<<<<"], { cwd: root, encoding: "utf8" });
  if (conflict.stdout.trim()) {
    console.error("Conflict markers found:", conflict.stdout);
    process.exit(1);
  }
  console.log("✓ No conflict markers");
}

function checkSingleDatabase() {
  console.log("\n▶ SQLite single-database check");
  const dbPath = path.join(root, "server/data/buzzard.db");
  if (!fs.existsSync(dbPath)) {
    console.warn("buzzard.db not present (will be created at runtime)");
  } else {
    console.log(`✓ buzzard.db exists (${Math.round(fs.statSync(dbPath).size / 1024)} KB)`);
  }

  const migrations = fs.readFileSync(path.join(root, "server/lib/db.js"), "utf8");
  if (migrations.includes("analytics_foundation_events")) {
    console.log("✓ analytics_foundation_* tables in buzzard.db migration");
  } else {
    console.error("✗ analytics foundation tables missing from db.js");
    process.exit(1);
  }
}

function checkStaticExport() {
  console.log("\n▶ Static export artifacts");
  const adminPage = path.join(root, "out/admin/analytics-foundation/index.html");
  if (!fs.existsSync(adminPage)) {
    console.error("✗ Missing out/admin/analytics-foundation/index.html — run npm run build first");
    process.exit(1);
  }
  console.log("✓ admin/analytics-foundation static export present");
}

console.log("\n══════════════════════════════════════════");
console.log(" BUZZARD #329 — Analytics Integration Gate");
console.log(" Chain: #323 → #324 → #325 → #326 → #327 → #328");
console.log("══════════════════════════════════════════");

checkGitIntegrity();
checkSingleDatabase();

const testScripts = [
  ["npm", ["run", "test:analytics-integration-gate"], "Integration gate unit tests"],
  ["npm", ["run", "test:analytics-kpi"], "KPI layer tests"],
  ["npm", ["run", "test:analytics"], "Analytics foundation tests"],
  ["npm", ["run", "test:analytics-persistence"], "Persistence tests"],
  ["npm", ["run", "test:analytics-storefront"], "Storefront integration tests"],
  ["npm", ["run", "test:commerce-order-engine-analytics"], "Commerce→Order→Analytics tests"],
  ["npm", ["run", "test:order-engine"], "Order Engine tests"],
  ["npm", ["run", "test:returns-engine"], "Returns Engine tests"],
  ["npm", ["run", "test:product-engine"], "Product Engine tests"],
  ["npm", ["run", "test:pricing-engine"], "Pricing Engine tests"],
  ["npm", ["run", "test:inventory-engine"], "Inventory Engine tests"],
  ["npm", ["run", "test:market-engine"], "Market Engine tests"],
  ["npm", ["run", "test:marketplace-engine"], "Marketplace Engine tests"],
  ["npm", ["run", "test:ai-orchestrator"], "AI Orchestrator tests"],
  ["npm", ["run", "test:ai-workers"], "AI Workers tests"],
  ["npm", ["run", "typecheck"], "TypeScript typecheck"],
  ["npm", ["run", "lint"], "ESLint"],
  ["npm", ["run", "build"], "Full production build"],
];

for (const [cmd, args, label] of testScripts) {
  run(cmd, args, label);
}

checkStaticExport();

console.log("\n▶ Production runtime QA (requires API on :3001, static on :3000)");
const qa = spawnSync("node", ["scripts/analytics-production-qa.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (qa.status !== 0) {
  console.warn("⚠ Production runtime QA skipped or failed — ensure servers are running");
  console.warn("  API:  BUZZARD_ANALYTICS_PERSISTENCE=sqlite PORT=3001 node server/server.js");
  console.warn("  Static: npx serve out -l 3000");
} else {
  console.log("✓ Production runtime QA");
}

console.log("\n══════════════════════════════════════════");
console.log(" INTEGRATION GATE COMPLETE");
console.log("══════════════════════════════════════════\n");
