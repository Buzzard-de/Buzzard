#!/usr/bin/env node
/**
 * Buzzard Master System Test — consolidated verification suite.
 * Usage: npm run test:master-system
 */
import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const failures = [];
let passed = 0;

function run(name, cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: "pipe", env: process.env });
    console.log(`✓ ${name}`);
    passed += 1;
  } catch (err) {
    const msg = err.stderr?.toString() || err.message;
    console.log(`✗ ${name}`);
    failures.push({ name, error: msg.slice(0, 500) });
  }
}

console.log("=== BUZZARD MASTER SYSTEM TEST ===\n");

run("typecheck", "npm run typecheck");
run("lint", "npm run lint");
run("build", "npm run build");

const testSuites = [
  ["PIM catalog", "npm run test:pim-catalog"],
  ["global localization", "npm run test:global-localization"],
  ["final catalog completion", "npm run test:final-catalog-completion"],
  ["automotive taxonomy", "npm run test:automotive"],
  ["automotive core", "npm run test:automotive-core"],
  ["automotive core integration", "npm run test:automotive-core-integration"],
  ["automotive production", "npm run test:automotive-production"],
  ["automotive production integration", "npm run test:automotive-production-integration"],
  ["return recovery", "npm run test:return-recovery"],
  ["return recovery smoke", "npm run test:return-recovery:smoke"],
  ["final system", "npm run test:final-system"],
  ["production safety", "npm run test:production-safety"],
  ["RBAC audit", "npm run test:rbac-audit"],
  ["security check", "npm run security:check"],
];

for (const [name, cmd] of testSuites) {
  run(name, cmd);
}

for (const part of [28, 29, 30, 31, 32, 33, 34, 35]) {
  run(`part${part}`, `npm run test:part${part}`);
}

console.log("\n--- Summary ---");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failures.length}`);

if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f.name}: ${f.error.split("\n")[0]}`);
  process.exit(1);
}

console.log("\nMASTER SYSTEM TEST: PASS");
process.exit(0);
