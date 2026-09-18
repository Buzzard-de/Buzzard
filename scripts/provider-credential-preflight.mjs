#!/usr/bin/env node
/**
 * Provider credential preflight — metadata-only validation pipeline.
 * No production activation. No fake credentials. No live HTTP unless credentials exist.
 */
import { createRequire } from "node:module";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);

let mod;
try {
  mod = require("../server/lib/productionAccess.bundle.cjs");
} catch {
  console.error("Bundle unavailable. Run: npm run build:production-access-bridge");
  process.exit(1);
}

const results = mod.validateAllProviderCredentialPipelines?.() ?? [];
const json = process.argv.includes("--json");

if (json) {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), providers: results }, null, 2));
} else {
  console.log("========================================");
  console.log("PROVIDER CREDENTIAL PREFLIGHT");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("========================================\n");
  for (const r of results) {
    console.log(`${r.providerId}: ${r.overallStatus}`);
    for (const p of r.phases) {
      console.log(`  ${p.phase}: ${p.status} — ${p.message}`);
    }
    if (r.blockers.length) console.log(`  Blockers: ${r.blockers.join(", ")}`);
    console.log("");
  }
}

const blocked = results.some((r) => r.overallStatus === "BLOCKED");
if (blocked) process.exit(1);

console.log("Provider credential preflight complete (metadata-only, no production activation).");
