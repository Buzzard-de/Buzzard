#!/usr/bin/env node
import { createRequire } from "node:module";

process.env.SALES_ENABLED = process.env.SALES_ENABLED || "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/productionCompletion.bundle.cjs");
const report = mod.buildFinalProductionCompletionReport();

console.log("BUZZARD FINAL PRODUCTION COMPLETION REPORT");
console.log(`SOFTWARE: ${report.software}`);
console.log(`ACCESS: ${report.sections.find((s) => s.section === "ACCESS")?.status || "BLOCKED"}`);
console.log(`INTER CARS: credential=NOT_CONFIGURED API access=UNVERIFIED read validation=UNVERIFIED createOrder validation=UNVERIFIED`);
console.log(`SALES: ${report.sales}`);
console.log(`FINAL GO-LIVE: ${report.finalGoLive}`);
console.log(`FAKE EVIDENCE: ${report.fakeEvidenceCount}`);
console.log(`Blockers: ${report.blockers.length}`);
console.log(JSON.stringify(report, null, 2));
