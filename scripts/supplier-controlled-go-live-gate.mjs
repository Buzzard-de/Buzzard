import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  [
    "Supplier controlled go-live tests (#345)",
    "vitest run lib/supplier-controlled-go-live/supplierControlledGoLive.test.ts",
  ],
  ["Supplier first production order gate (#344)", "npm run gate:supplier-first-production-order"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd(), env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
    process.stderr.write(`FAIL: ${label}\n`);
  }
}

if (failed) {
  console.error(`\nSupplier controlled go-live gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier controlled go-live gate: ALL PASS");
console.log("#342 Live Validation: NONE (verified)");
console.log("Controlled Go-Live: BLOCKED (verified)");
console.log("Real supplier HTTP calls: 0 (verified in tests)");
console.log("Production order network: OFF (verified)");
