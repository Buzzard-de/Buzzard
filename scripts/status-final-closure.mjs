#!/usr/bin/env node
import { createRequire } from "node:module";

process.env.SALES_ENABLED = process.env.SALES_ENABLED || "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";

const require = createRequire(import.meta.url);
const mod = require("../server/lib/finalClosure.bundle.cjs");
const accessMod = require("../server/lib/productionAccess.bundle.cjs");
const report = mod.buildFinalClosureReport();
const access = accessMod.buildMissingProductionAccessReport?.() ?? { providers: [] };
const ic = report.interCarsFlow;
const interCarsDiag = report.blockers.filter((b) => b.provider === "inter-cars");

function section(name) {
  return report.sections.find((s) => s.section === name)?.status ?? "UNVERIFIED";
}

function providerStatus(id) {
  const p = access.providers?.find((x) => x.providerId === id);
  if (!p) return "NOT_CONFIGURED";
  if (p.liveValidation === "VALIDATED") return "VALIDATED";
  if (p.secret?.secretRefConfigured || p.secret?.secretResolvable) return "CONFIGURED";
  return "NOT_CONFIGURED";
}

console.log("========================================");
console.log("BUZZARD FINAL CLOSURE REPORT");
console.log("========================================");
console.log(`SOFTWARE:\n${report.software}`);
console.log(`ACCESS:\n${section("ACCESS")}`);
console.log("INTER CARS:");
console.log(`  Credential: ${providerStatus("inter-cars")}`);
console.log(`  API: ${ic[0]?.status || "UNVERIFIED"}`);
console.log(`  Read Validation: ${ic[0]?.status || "UNVERIFIED"}`);
console.log(`  CreateOrder: ${ic[1]?.status || "UNVERIFIED"}`);
console.log(`  First Order: ${ic[3]?.status || "BLOCKED"}`);
console.log(`  Tracking: ${section("FULFILLMENT")}`);
console.log(`PAYMENT:\n  Credential: ${providerStatus("payment")}`);
console.log(`  Validation: ${section("PAYMENT")}\n  Production: OFF`);
console.log(`CARRIER:\n  Credential: ${providerStatus("carrier")}`);
console.log(`  Validation: ${section("CARRIER")}\n  Production: OFF`);
console.log(`AI:\n  Credential: ${providerStatus("ai")}`);
console.log(`  Validation: ${section("AI")}\n  Production: OFF`);
console.log(`RETURNS:\n  Credential: ${providerStatus("returns")}`);
console.log(`  Validation: ${section("RETURNS")}\n  Production: OFF`);
console.log(`MARKETING:\n  Credential: ${providerStatus("marketing")}`);
console.log(`  Validation: ${section("MARKETING")}\n  Production: OFF`);
console.log(`BACKUP:\n${report.backupRestore.result === "PASS" ? "PASS" : report.backupRestore.result}`);
console.log(`SECURITY:\n${section("SECURITY")}`);
console.log(`MONITORING:\n${section("MONITORING")}`);
console.log(`FINANCIAL:\n${section("FINANCIAL")}`);
console.log(`OBSERVATION:\n${section("OBSERVATION")}`);
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
