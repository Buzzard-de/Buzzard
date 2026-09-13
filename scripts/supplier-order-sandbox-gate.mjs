import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_LIVE_READ_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  ["Supplier order sandbox tests", "vitest run lib/supplier-engine/supplierOrderSandbox.test.ts"],
  ["Supplier connector framework tests", "vitest run lib/supplier-engine/supplierConnectorFramework.test.ts"],
  ["Supplier engine regression", "vitest run lib/supplier-engine/supplierEngine.test.ts"],
  ["Supplier production readiness", "vitest run lib/supplier-engine/supplierProductionReadiness.test.ts"],
  ["Order engine tests", "vitest run lib/order-engine/orderEngine.test.ts"],
  ["Inventory engine tests", "vitest run lib/inventory-engine/inventoryEngine.test.ts"],
  ["Pricing engine tests", "vitest run lib/pricing-engine/pricingEngine.test.ts"],
  ["Marketplace engine tests", "vitest run lib/marketplace-engine/marketplaceEngine.test.ts"],
  ["Returns engine tests", "vitest run lib/returns-engine/returnsEngine.test.ts"],
  ["AI orchestrator tests", "vitest run lib/ai-orchestrator/aiOrchestrator.test.ts"],
  ["AI worker tests", "vitest run lib/ai-workers/aiWorkers.test.ts"],
  ["Typecheck", "npm run typecheck"],
  ["Lint", "npm run lint"],
  ["Production build", "npm run build"],
];

let failed = 0;
const results = [];

for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
    results.push({ label, status: "PASS" });
  } catch {
    failed++;
    process.stderr.write(`FAIL: ${label}\n`);
    results.push({ label, status: "FAIL" });
  }
}

process.stdout.write("\n#335 Supplier Order Sandbox Gate Summary\n");
for (const row of results) {
  process.stdout.write(`${row.status}: ${row.label}\n`);
}

if (failed) {
  console.error(`\nSupplier order sandbox gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier order sandbox gate: ALL PASS");
console.log("Real supplier order network: DISABLED (verified)");
