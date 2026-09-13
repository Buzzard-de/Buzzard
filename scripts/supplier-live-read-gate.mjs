import { execSync } from "node:child_process";

const hasLiveCredentials = Boolean(
  process.env.SUPPLIER_LIVE_CREDENTIALS?.trim() ||
    process.env.SUPPLIER_LIVE_CONFIG_JSON?.trim() ||
    (process.env.SUPPLIER_LIVE_SUPPLIER_ID?.trim() && process.env.SUPPLIER_LIVE_BASE_URL?.trim())
);

const steps = [
  ["Supplier connector gate", "npm run gate:supplier-connector"],
  ["Supplier live read unit tests", "vitest run lib/supplier-engine/supplierLiveRead.test.ts"],
];

if (hasLiveCredentials && process.env.SUPPLIER_LIVE_READ_ENABLED === "1") {
  steps.push([
    "Live supplier sandbox smoke (manual credentials present)",
    "node scripts/supplier-live-read-smoke.mjs",
  ]);
} else {
  process.stdout.write("\nSKIPPED — NO LIVE SUPPLIER CREDENTIALS (live sandbox smoke not executed)\n");
}

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
  console.error(`\nSupplier live-read gate failed (${failed} step(s)).`);
  process.exit(1);
}

console.log("\nSupplier live-read gate: ALL PASS");
