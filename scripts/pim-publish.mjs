#!/usr/bin/env node
/**
 * Part 15 — Explicit catalog publish (visibility only — NOT sales).
 *
 * Usage:
 *   npm run pim:publish -- --dry-run --sku=BUZ-AUTO-000009
 *   npm run pim:publish -- --sku=BUZ-AUTO-000009
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const publish = require("../server/lib/pim/productCatalogPublish.js");
const { checkProductionSafety } = require("../server/lib/pim/productionSafetyGate.js");
const goLiveApproval = require("../server/lib/commerce/goLiveApproval.js");

function parseArgs(argv) {
  const args = { dryRun: false, sku: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg.startsWith("--sku=")) args.sku = arg.slice("--sku=".length).trim();
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.sku) {
    console.error("Usage: npm run pim:publish -- [--dry-run] --sku=SKU");
    process.exit(1);
  }

  const safety = checkProductionSafety();
  console.log("=== PRODUCTION SAFETY ===");
  console.log(`BUZZARD_SALES_ENABLED: ${process.env.BUZZARD_SALES_ENABLED === "1" ? "1" : "0"}`);
  console.log(`GO-LIVE LOCK:          ${goLiveApproval.PRODUCTION_SAFETY_LOCK ? "ACTIVE" : "INACTIVE"}`);
  console.log(`Safety gate:           ${safety.ok ? "PASS" : "FAIL"}`);
  console.log("");

  const result = args.dryRun
    ? publish.publishDryRun(args.sku)
    : publish.publishProduct(args.sku);

  console.log(JSON.stringify(result, null, 2));

  if (!args.dryRun && !result.success) process.exit(1);
}

main().catch((err) => {
  console.error("pim:publish failed:", err.message);
  process.exit(1);
});
