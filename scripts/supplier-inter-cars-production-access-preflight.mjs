#!/usr/bin/env node
/**
 * Dry-run Inter Cars production access diagnostic — no HTTP, no createOrder.
 */
import { createRequire } from "node:module";

process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/supplierInterCarsProductionAccess.bundle.cjs");

const diagnostic = mod.evaluateInterCarsProductionAccess();
const preflight = mod.runProductionAccessPreflight();

console.log(JSON.stringify({ diagnostic, preflight }, null, 2));

if (diagnostic.realHttpCalls !== 0 || diagnostic.realCreateOrderCalls !== 0) {
  console.error("FAIL: real HTTP side effects detected");
  process.exit(1);
}

console.log("\n" + mod.formatInterCarsAccessStatusReport());
console.log("\nInter Cars production preflight complete (dry-run, no HTTP, no CreateOrder).");
