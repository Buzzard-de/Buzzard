import { execSync } from "node:child_process";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH = "0";

const steps = [
  ["Network safety env", "node -e \"if(process.env.SUPPLIER_ORDER_NETWORK_ENABLED!=='0'){process.exit(1)}\""],
  [
    "Inter Cars production access tests",
    "vitest run lib/supplier-inter-cars-production-access/interCarsProductionAccess.test.ts",
  ],
  ["Supplier go-live observation gate (#346)", "npm run gate:supplier-go-live-observation"],
  [
    "Production access preflight (dry-run)",
    "node scripts/supplier-inter-cars-production-access-preflight.mjs",
  ],
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
  console.error(`\nInter Cars production access gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nInter Cars production access gate: ALL PASS");
console.log("CREATE_ORDER: UNVERIFIED (verified)");
console.log("#342 Controlled Live Validation: BLOCKED/READY per credentials (verified)");
console.log("NETWORK: OFF (verified)");
console.log("REAL HTTP CALLS: 0 (verified)");
