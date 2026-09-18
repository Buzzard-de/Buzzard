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

// lib/payment-production/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  assertPaymentProductionSafetyInvariants: () => assertPaymentProductionSafetyInvariants,
  getPaymentProductionDashboard: () => getPaymentProductionDashboard,
  getPaymentProductionSafetyCounters: () => getPaymentProductionSafetyCounters
});
module.exports = __toCommonJS(serverEntry_exports);

// lib/production-defaults/index.ts
var FLAG_ENV = {
  SUPPLIER_NETWORK: "SUPPLIER_NETWORK_ENABLED",
  SUPPLIER_LIVE_READ: "SUPPLIER_LIVE_READ_ENABLED",
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

// lib/payment-production/config.ts
var PAYMENT_PRODUCTION_VERSION = "350.1.0";
function isPaymentProductionEnabled() {
  return isProductionFlagEnabled("PAYMENT_PRODUCTION");
}
function getDefaultPaymentProviderId() {
  const configured = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (configured === "stripe" || configured === "adyen" || configured === "paypal") return configured;
  return "mock";
}

// lib/payment-production/safety.ts
var counters = { realCharges: 0, realRefunds: 0, webhookProcessed: 0 };
function getPaymentProductionSafetyCounters() {
  return { ...counters };
}
function assertPaymentProductionSafetyInvariants() {
  const violations = [];
  if (counters.realCharges !== 0) violations.push(`realCharges=${counters.realCharges}`);
  if (counters.realRefunds !== 0) violations.push(`realRefunds=${counters.realRefunds}`);
  return { ok: violations.length === 0, violations };
}

// lib/payment-production/admin.ts
function getPaymentProductionDashboard() {
  const safety = assertPaymentProductionSafetyInvariants();
  return {
    version: PAYMENT_PRODUCTION_VERSION,
    productionEnabled: isPaymentProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    defaultProvider: getDefaultPaymentProviderId(),
    safetyCounters: getPaymentProductionSafetyCounters(),
    blockers: isPaymentProductionEnabled() ? ["PAYMENT_PRODUCTION_MUST_BE_DISABLED_IN_PREP"] : safety.violations
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertPaymentProductionSafetyInvariants,
  getPaymentProductionDashboard,
  getPaymentProductionSafetyCounters
});
