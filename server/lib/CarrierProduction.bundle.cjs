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

// lib/carrier-production/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  assertCarrierProductionSafetyInvariants: () => assertCarrierProductionSafetyInvariants,
  getCarrierProductionDashboard: () => getCarrierProductionDashboard,
  getCarrierProductionSafetyCounters: () => getCarrierProductionSafetyCounters
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

// lib/carrier-production/config.ts
var CARRIER_PRODUCTION_VERSION = "351.1.0";
function isCarrierProductionEnabled() {
  return isProductionFlagEnabled("CARRIER_PRODUCTION");
}

// lib/carrier-production/safety.ts
var counters = { realLabels: 0, realHttpCalls: 0 };
function getCarrierProductionSafetyCounters() {
  return { ...counters };
}
function assertCarrierProductionSafetyInvariants() {
  const violations = [];
  if (counters.realLabels !== 0) violations.push(`realLabels=${counters.realLabels}`);
  if (counters.realHttpCalls !== 0) violations.push(`realHttpCalls=${counters.realHttpCalls}`);
  return { ok: violations.length === 0, violations };
}

// lib/carrier-production/admin.ts
function getCarrierProductionDashboard() {
  const safety = assertCarrierProductionSafetyInvariants();
  return {
    version: CARRIER_PRODUCTION_VERSION,
    productionEnabled: isCarrierProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: "NOT_CONFIGURED",
    safetyCounters: getCarrierProductionSafetyCounters(),
    blockers: safety.violations
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertCarrierProductionSafetyInvariants,
  getCarrierProductionDashboard,
  getCarrierProductionSafetyCounters
});
