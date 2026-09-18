#!/usr/bin/env node
import { createRequire } from "node:module";

process.env.SALES_ENABLED = process.env.SALES_ENABLED || "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/finalClosure.bundle.cjs");
const report = mod.buildFinalClosureReport();
const ic = report.interCarsFlow;
const interCarsDiag = report.blockers.filter((b) => b.provider === "inter-cars");

console.log("========================================");
console.log("BUZZARD FINAL CLOSURE REPORT");
console.log("========================================");
console.log(`SOFTWARE:\n${report.software}`);
console.log(`ACCESS:\n${report.sections.find((s) => s.section === "ACCESS")?.status || "BLOCKED"}`);
console.log("INTER CARS:");
console.log(`  Credential: ${report.sections.find((s) => s.section === "ACCESS")?.status}`);
console.log(`  API: ${ic[0]?.status || "UNVERIFIED"}`);
console.log(`  Read Validation: ${ic[0]?.status || "UNVERIFIED"}`);
console.log(`  CreateOrder: ${ic[1]?.status || "UNVERIFIED"}`);
console.log(`  First Order: ${ic[3]?.status || "BLOCKED"}`);
console.log(`  Tracking: UNVERIFIED`);
console.log(`PAYMENT:\n  Credential: ${report.sections.find((s) => s.section === "PAYMENT")?.status}`);
console.log(`  Validation: UNVERIFIED\n  Production: OFF`);
console.log(`CARRIER:\n  Credential: NOT_CONFIGURED\n  Validation: UNVERIFIED\n  Production: OFF`);
console.log(`AI:\n  Credential: NOT_CONFIGURED\n  Validation: UNVERIFIED\n  Production: OFF`);
console.log(`RETURNS:\n  Credential: NOT_CONFIGURED\n  Validation: UNVERIFIED\n  Production: OFF`);
console.log(`MARKETING:\n  Credential: NOT_CONFIGURED\n  Validation: UNVERIFIED\n  Production: OFF`);
console.log(`BACKUP:\n${report.backupRestore.result === "PASS" ? "PASS" : report.backupRestore.result}`);
console.log(`SECURITY:\n${report.sections.find((s) => s.section === "SECURITY")?.status}`);
console.log(`MONITORING:\n${report.sections.find((s) => s.section === "MONITORING")?.status}`);
console.log(`FINANCIAL:\nUNVERIFIED`);
console.log(`OBSERVATION:\n${report.sections.find((s) => s.section === "OBSERVATION")?.status}`);
console.log(`SALES:\n${report.sales}`);
console.log(`FINAL GO-LIVE:\n${report.finalGoLive}`);
console.log("REAL SIDE EFFECTS:");
console.log(`  Orders: ${report.realSideEffects.realSupplierOrders || 0}`);
console.log(`  Payments: ${report.realSideEffects.realPayments || 0}`);
console.log(`  Shipments: ${report.realSideEffects.realCarrierLabels || 0}`);
console.log(`  Refunds: ${report.realSideEffects.realRefunds || 0}`);
console.log(`  Marketing Spend: ${report.realSideEffects.realMarketingSpend || 0}`);
console.log(`FAKE EVIDENCE:\n${report.fakeEvidenceCount}`);
console.log(`CRITICAL BLOCKERS:\n${report.criticalBlockerCount}`);
console.log(`FINAL DECISION:\n${report.finalDecision}`);
console.log("========================================");

for (const s of report.sections) {
  console.log(`${s.section}: ${s.status}`);
}

if (interCarsDiag.length) {
  console.log("\nTop Inter Cars blockers:");
  for (const b of interCarsDiag.slice(0, 5)) {
    console.log(`  [${b.severity}] ${b.code}: ${b.requiredAction}`);
  }
}
