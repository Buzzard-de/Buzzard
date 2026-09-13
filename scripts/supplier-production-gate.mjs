import { execSync } from "node:child_process";

const steps = [
  ["Supplier Engine tests", "npm run test:supplier-engine"],
  ["Product Engine tests", "npm run test:product-engine"],
  ["Inventory Engine tests", "npm run test:inventory-engine"],
  ["Pricing Engine tests", "npm run test:pricing-engine"],
  ["Order Engine tests", "npm run test:order-engine"],
  ["Returns Engine tests", "npm run test:returns-engine"],
  ["Marketplace Engine tests", "npm run test:marketplace-engine"],
  ["Analytics tests", "npm run test:analytics && npm run test:analytics-kpi"],
  ["AI Orchestrator tests", "npm run test:ai-orchestrator"],
  ["AI Workers tests", "npm run test:ai-workers"],
  ["Typecheck", "npm run typecheck"],
  ["Lint", "npm run lint"],
  ["Production build", "npm run build"],
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
  console.error(`\nSupplier production gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier production gate: ALL PASS");
