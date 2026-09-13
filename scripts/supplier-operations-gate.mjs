import { execSync } from "node:child_process";

const steps = [
  ["Supplier production gate", "npm run gate:supplier-production"],
  ["Supplier operations persistence tests", "vitest run lib/supplier-engine/supplierOperationsPersistence.test.ts"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
    process.stderr.write(`FAIL: ${label}\n`);
  }
}

if (failed) {
  console.error(`\nSupplier operations gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier operations gate: ALL PASS");
