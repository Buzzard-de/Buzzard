import { execSync, spawnSync } from "node:child_process";

const hasResolvableOAuthToken = Boolean(
  (() => {
    const raw = process.env.SUPPLIER_LIVE_CREDENTIALS?.trim();
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed.accessToken || parsed.token || parsed.bearer);
    } catch {
      return raw.length > 0;
    }
  })()
);

const hasLiveCredentials =
  hasResolvableOAuthToken ||
  Boolean(process.env.SUPPLIER_LIVE_CONFIG_JSON?.trim());

const unitSteps = [
  ["Supplier connector gate", "npm run gate:supplier-connector"],
  ["Supplier live read unit tests", "vitest run lib/supplier-engine/supplierLiveRead.test.ts"],
  ["Supplier live onboarding unit tests", "vitest run lib/supplier-engine/supplierLiveOnboarding.test.ts"],
  ["Supplier live validation verdict tests", "vitest run lib/supplier-engine/supplierLiveValidationVerdict.test.ts"],
];

let unitFailed = 0;
for (const [label, cmd] of unitSteps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    unitFailed++;
    process.stderr.write(`FAIL: ${label}\n`);
  }
}

let liveVerdict = "LIVE NOT VALIDATED / SKIPPED";
let liveMessage = "LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED";
let liveExitCode = 0;

if (hasLiveCredentials && process.env.SUPPLIER_NETWORK_ENABLED === "1") {
  process.stdout.write("\n=== Live Inter Cars onboarding pipeline ===\n");
  const result = spawnSync("node", ["scripts/supplier-live-onboarding.mjs"], {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPPLIER_LIVE_PROFILE: process.env.SUPPLIER_LIVE_PROFILE || "inter-cars",
    },
  });
  if (result.status === 0) {
    liveVerdict = "LIVE VALIDATED";
    liveMessage = "REAL B2B SUPPLIER ONBOARDING VALIDATED";
  } else if (result.status === 2) {
    liveVerdict = "LIVE NOT VALIDATED / SKIPPED";
    liveMessage = "LIVE VALIDATION BLOCKED — REAL INTER CARS CREDENTIALS REQUIRED";
  } else {
    liveVerdict = "LIVE VALIDATION FAILED";
    liveMessage = "Live Inter Cars validation attempted but failed";
    liveExitCode = 1;
  }
} else if (hasLiveCredentials) {
  process.stdout.write(
    "\nLIVE NOT VALIDATED / SKIPPED — SUPPLIER_NETWORK_ENABLED=1 required for live connection test\n"
  );
} else {
  process.stdout.write(
    "\nLIVE NOT VALIDATED / SKIPPED — REAL INTER CARS CREDENTIALS REQUIRED (SUPPLIER_LIVE_CREDENTIALS OAuth token)\n"
  );
}

process.stdout.write("\n========================================\n");
process.stdout.write(`UNIT TESTS: ${unitFailed === 0 ? "PASS" : "FAIL"}\n`);
process.stdout.write(`LIVE VALIDATION VERDICT: ${liveVerdict}\n`);
process.stdout.write(`${liveMessage}\n`);
process.stdout.write("========================================\n");

if (unitFailed) {
  console.error(`\nSupplier live-read gate failed (${unitFailed} unit step(s)).`);
  process.exit(1);
}

if (liveExitCode) {
  console.error("\nLive Inter Cars validation failed.");
  process.exit(1);
}

console.log("\nSupplier live-read gate: UNIT TESTS PASS (live validation verdict printed above)");
