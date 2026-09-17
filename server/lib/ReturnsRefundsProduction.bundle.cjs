const __import_meta_url__=require("url").pathToFileURL(__filename).href;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/returns-refunds-production/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  assertReturnsRefundsSafetyInvariants: () => assertReturnsRefundsSafetyInvariants,
  getReturnsRefundsProductionDashboard: () => getReturnsRefundsProductionDashboard,
  getReturnsRefundsSafetyCounters: () => getReturnsRefundsSafetyCounters
});
module.exports = __toCommonJS(serverEntry_exports);

// lib/production-defaults/index.ts
var FLAG_ENV = {
  SUPPLIER_NETWORK: "SUPPLIER_NETWORK_ENABLED",
  SUPPLIER_ORDER_NETWORK: "SUPPLIER_ORDER_NETWORK_ENABLED",
  PAYMENT_PRODUCTION: "PAYMENT_PRODUCTION_ENABLED",
  CARRIER_PRODUCTION: "CARRIER_PRODUCTION_ENABLED",
  RETURNS_PRODUCTION: "RETURNS_PRODUCTION_ENABLED",
  MARKETING_SPEND: "MARKETING_SPEND_ENABLED",
  AI_PRODUCTION: "AI_PRODUCTION_ENABLED",
  SALES: "SALES_ENABLED"
};
function isProductionFlagEnabled(flag) {
  const envKey = FLAG_ENV[flag];
  const value = process.env[envKey];
  return value === "1" || value === "true";
}

// lib/returns-refunds-production/config.ts
var RETURNS_REFUNDS_PRODUCTION_VERSION = "353.1.0";
function isReturnsProductionEnabled() {
  return isProductionFlagEnabled("RETURNS_PRODUCTION");
}

// lib/returns-refunds-production/safety.ts
var counters = { realRefunds: 0, assumedRecoveries: 0 };
function getReturnsRefundsSafetyCounters() {
  return { ...counters };
}
function assertReturnsRefundsSafetyInvariants() {
  const violations = [];
  if (counters.realRefunds !== 0) violations.push(`realRefunds=${counters.realRefunds}`);
  if (counters.assumedRecoveries !== 0) violations.push(`assumedRecoveries=${counters.assumedRecoveries}`);
  return { ok: violations.length === 0, violations };
}

// lib/returns-refunds-production/admin.ts
function getReturnsRefundsProductionDashboard() {
  const safety = assertReturnsRefundsSafetyInvariants();
  return {
    version: RETURNS_REFUNDS_PRODUCTION_VERSION,
    productionEnabled: isReturnsProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    safetyCounters: getReturnsRefundsSafetyCounters(),
    blockers: safety.violations
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertReturnsRefundsSafetyInvariants,
  getReturnsRefundsProductionDashboard,
  getReturnsRefundsSafetyCounters
});
