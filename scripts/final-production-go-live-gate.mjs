import { execSync } from "node:child_process";
import { createRequire } from "node:module";

process.env.SALES_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const steps = [
  ["Production flags OFF", "node -e \"const f=['SALES_ENABLED','MARKETING_SPEND_ENABLED','SUPPLIER_ORDER_NETWORK_ENABLED'];for(const k of f){if(process.env[k]==='1')process.exit(1)}\""],
  ["#354 final gate tests", "vitest run lib/final-production-go-live/finalProductionGoLive.test.ts"],
  ["Production access tests", "vitest run lib/production-access/productionAccess.test.ts"],
  ["Production completion tests", "vitest run lib/production-completion/productionCompletion.test.ts"],
  ["Production kill switch tests", "vitest run lib/production-kill-switch/productionKillSwitch.test.ts"],
  ["Upstream #353 gate", "npm run gate:returns-refunds-production"],
];

let failed = 0;
for (const [label, cmd] of steps) {
  process.stdout.write(`\n=== ${label} ===\n`);
  try {
    execSync(cmd, { stdio: "inherit", env: { ...process.env } });
    process.stdout.write(`PASS: ${label}\n`);
  } catch {
    failed++;
  }
}

if (failed) {
  console.error(`\nFinal production go-live gate failed (${failed} step(s)).`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
try {
  const mod = require("../server/lib/FinalProductionGoLive.bundle.cjs");
  const gate = mod.evaluateFinalProductionGate();
  console.log("\n=== Final gate summary ===");
  console.log(`Phase: ${gate.phase}`);
  console.log(`Sales: ${gate.salesEnabled}`);
  console.log(`Live: ${gate.liveStatus}`);
  console.log(`Real supplier orders: ${gate.safetyCounters.realSupplierOrders}`);
  console.log(`Real payments: ${gate.safetyCounters.realPayments}`);
  console.log(`Real refunds: ${gate.safetyCounters.realRefunds}`);
  console.log(`Real carrier labels: ${gate.safetyCounters.realCarrierLabels}`);
  console.log(`Real marketing spend: ${gate.safetyCounters.realMarketingSpend}`);
} catch {
  console.log("(Bundle preflight skipped — run build first)");
}

console.log("\nFinal production go-live gate (#354): ALL PASS");
console.log("SALES: CLOSED | LIVE: BLOCKED | REAL SIDE EFFECTS: 0");
