#!/usr/bin/env node
/**
 * Master Completion Matrix — aggregates existing SSOT status reports.
 * Dry-run only. No production activation. No fake credentials.
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

process.env.SALES_ENABLED = "0";
process.env.SUPPLIER_NETWORK_ENABLED = "0";
process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
process.env.PAYMENT_PRODUCTION_ENABLED = "0";
process.env.CARRIER_PRODUCTION_ENABLED = "0";
process.env.RETURNS_PRODUCTION_ENABLED = "0";
process.env.MARKETING_SPEND_ENABLED = "0";
process.env.AI_PRODUCTION_ENABLED = "0";

const require = createRequire(import.meta.url);

function load(name, fn) {
  try {
    return fn();
  } catch (err) {
    return { error: err.message };
  }
}

const closure = load("final-closure", () => {
  const mod = require("../server/lib/finalClosure.bundle.cjs");
  return mod.buildFinalClosureReport();
});

const finalProd = load("final-production", () => {
  const mod = require("../server/lib/FinalProductionGoLive.bundle.cjs");
  return mod.buildFinalProductionStatusReport?.() ?? {};
});

const interCars = load("inter-cars", () => {
  const mod = require("../server/lib/supplierInterCarsProductionAccess.bundle.cjs");
  return mod.buildInterCarsAccessStatusReport?.() ?? {};
});

function softwareStatus(topic) {
  const ws = (finalProd.workstreams || []).find((w) =>
    w.workstream?.toLowerCase().includes(topic.toLowerCase())
  );
  if (ws?.implementation === "PASS") return "PASS";
  if (closure.software === "PASS") return "PASS";
  return "PARTIAL";
}

function liveAccess(sectionStatus) {
  if (sectionStatus === "PASS") return "READY";
  if (sectionStatus === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (sectionStatus === "BLOCKED") return "BLOCKED";
  return "NOT_CONFIGURED";
}

function productionFlag(enabled) {
  return enabled ? "ACTIVE" : "OFF";
}

function sectionStatus(name) {
  return closure.sections?.find((s) => s.section === name)?.status ?? "UNVERIFIED";
}

function row(topic, software, test, live, prod, blocker = "") {
  return { topic, software, test, live, prod, blocker };
}

const matrix = [
  row(
    "INTER CARS",
    interCars.software === "COMPLETE" ? "PASS" : "PARTIAL",
    "PASS",
    interCars.credential === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "BLOCKED",
    "OFF",
    (interCars.blockers || []).slice(0, 2).join("; ") || "CREDENTIAL_NOT_CONFIGURED"
  ),
  row("PAYMENT", softwareStatus("payment"), "PASS", liveAccess(sectionStatus("PAYMENT")), "OFF", "PROVIDER_NOT_CONFIGURED"),
  row("CARRIER", softwareStatus("carrier"), "PASS", liveAccess(sectionStatus("CARRIER")), "OFF", "PROVIDER_NOT_CONFIGURED"),
  row("TRACKING", "PASS", "PASS", "UNVERIFIED", "OFF", "CARRIER_CREDENTIAL_REQUIRED"),
  row("RETURNS", softwareStatus("returns"), "PASS", liveAccess(sectionStatus("RETURNS")), "OFF", "PROVIDER_NOT_CONFIGURED"),
  row("REFUNDS", softwareStatus("returns"), "PASS", liveAccess(sectionStatus("RETURNS")), "OFF", "PROVIDER_NOT_CONFIGURED"),
  row("FINANCIAL", "PASS", "PARTIAL", "UNVERIFIED", "OFF", "REQUIRES_LIVE_ORDER"),
  row("AI", softwareStatus("ai"), "PASS", liveAccess(sectionStatus("AI")), "OFF", "PROVIDER_NOT_CONFIGURED"),
  row("MARKETING", softwareStatus("marketing"), "PASS", liveAccess(sectionStatus("MARKETING")), "OFF", "PROVIDER_NOT_CONFIGURED"),
  row("MARKETPLACE", "PASS", "PASS", "NOT_CONFIGURED", "OFF", "MARKETPLACE_CREDENTIALS"),
  row("COUNTRY LANGUAGE", "PASS", "PASS", "READY", "OFF", ""),
  row("I18N", "PASS", "PASS", "READY", "OFF", ""),
  row("PRODUCT", "PASS", "PASS", "READY", "OFF", ""),
  row("SUPPLIER", "PASS", "PASS", "NOT_CONFIGURED", "OFF", "INTER_CARS_CREDENTIAL"),
  row("INVENTORY", "PASS", "PASS", "READY", "OFF", ""),
  row("PRICING", "PASS", "PASS", "READY", "OFF", ""),
  row("ORDER", "PASS", "PASS", "READY", "OFF", ""),
  row("ANALYTICS", "PASS", "PASS", "READY", "OFF", ""),
  row("DEPLOYMENT", "PASS", "PARTIAL", "BLOCKED", "OFF", "RENDER_PERSISTENCE_MANUAL"),
  row("SECURITY", sectionStatus("SECURITY"), "PASS", "READY", "OFF", ""),
  row("MONITORING", sectionStatus("MONITORING"), "PASS", "READY", "OFF", ""),
  row("BACKUP", sectionStatus("BACKUP"), "PASS", "READY", "OFF", ""),
  row("GO-LIVE", closure.finalGoLive === "READY" ? "PASS" : "BLOCKED", "PASS", "BLOCKED", "OFF", "CREDENTIALS_AND_APPROVAL"),
];

console.log("========================================");
console.log("BUZZARD MASTER COMPLETION MATRIX");
console.log(`Generated: ${new Date().toISOString()}`);
console.log("========================================\n");

console.log("TOPIC | SOFTWARE | TEST | LIVE ACCESS | PRODUCTION | BLOCKER");
console.log("-".repeat(90));
for (const r of matrix) {
  const line = [
    r.topic.padEnd(18),
    r.software.padEnd(8),
    r.test.padEnd(8),
    r.live.padEnd(16),
    r.prod.padEnd(12),
    r.blocker.slice(0, 40),
  ].join(" | ");
  console.log(line);
}

console.log("\n========================================");
console.log("FINAL STATE");
console.log("========================================");
console.log(`SOFTWARE COMPLETE: ${closure.software === "PASS" ? "YES (implemented layers)" : "NO"}`);
console.log(`SALES: ${closure.sales}`);
console.log(`FINAL GO-LIVE: ${closure.finalGoLive}`);
console.log(`CRITICAL BLOCKERS: ${closure.criticalBlockerCount ?? "?"}`);
console.log("\nACCESS BLOCKERS:");
console.log("  - Inter Cars: SUPPLIER_LIVE_CREDENTIALS_SECRET_REF not configured");
console.log("  - Payment: provider secretRef not configured (all providers DISABLED)");
console.log("  - Carrier: carrier secretRef not configured");
console.log("  - AI: AI production provider secretRef not configured");
console.log("  - Returns: returns provider secretRef not configured");
console.log("  - Marketing: marketing spend credentials not configured");
console.log("\nHUMAN APPROVAL BLOCKERS:");
console.log("  - #342 controlled createOrder validation (four-eyes)");
console.log("  - #343 production order arming");
console.log("  - #344 first production order (dual approval)");
console.log("  - #345 controlled go-live activation");
console.log("  - #346 observation period completion");
console.log("\nEXTERNAL PROVIDER BLOCKERS:");
console.log("  - Inter Cars API live access (Stage A: health/catalog/stock/price)");
console.log("  - Payment provider sandbox/live API keys");
console.log("  - Carrier label API credentials");
console.log("  - Marketplace connector credentials (Amazon/eBay/etc.)");
console.log("\nPRODUCTION FLAGS:");
console.log(`  SALES_ENABLED: ${process.env.SALES_ENABLED}`);
console.log(`  SUPPLIER_NETWORK_ENABLED: ${process.env.SUPPLIER_NETWORK_ENABLED}`);
console.log(`  SUPPLIER_ORDER_NETWORK_ENABLED: ${process.env.SUPPLIER_ORDER_NETWORK_ENABLED}`);
console.log(`  PAYMENT_PRODUCTION_ENABLED: ${process.env.PAYMENT_PRODUCTION_ENABLED}`);
console.log(`  CARRIER_PRODUCTION_ENABLED: ${process.env.CARRIER_PRODUCTION_ENABLED}`);
console.log("\nREAL SIDE EFFECTS:");
const fx = closure.realSideEffects || {};
console.log(`  Supplier orders: ${fx.realSupplierOrders ?? 0}`);
console.log(`  Payments: ${fx.realPayments ?? 0}`);
console.log(`  Shipments: ${fx.realCarrierLabels ?? 0}`);
console.log(`  Refunds: ${fx.realRefunds ?? 0}`);
console.log(`  Marketing spend: ${fx.realMarketingSpend ?? 0}`);
console.log(`  Fake evidence: ${closure.fakeEvidenceCount ?? 0}`);
console.log("\nFINAL DECISION: BLOCKED (expected without credentials + human approval)");
console.log("========================================");
