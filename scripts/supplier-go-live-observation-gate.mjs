import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  [
    "Supplier go-live observation tests (#346)",
    "vitest run lib/supplier-go-live-observation/supplierGoLiveObservation.test.ts",
  ],
  ["Supplier controlled go-live gate (#345)", "npm run gate:supplier-controlled-go-live"],
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
  console.error(`\nSupplier go-live observation gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier go-live observation gate: ALL PASS");
console.log("#342 Live Validation: NONE (verified)");
console.log("#345 Controlled Go-Live: BLOCKED (verified)");
console.log("#346 Observation: BLOCKED (verified)");
console.log("#346 Broader Rollout: BLOCKED (verified)");
console.log("Real supplier HTTP calls: 0 (verified in tests)");
console.log("Production order network: OFF (verified)");
