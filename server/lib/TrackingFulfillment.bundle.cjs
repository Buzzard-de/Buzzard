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

// lib/tracking-fulfillment/serverEntry.ts
var serverEntry_exports = {};
__export(serverEntry_exports, {
  assertTrackingSafetyInvariants: () => assertTrackingSafetyInvariants,
  getTrackingFulfillmentDashboard: () => getTrackingFulfillmentDashboard,
  getTrackingSafetyCounters: () => getTrackingSafetyCounters
});
module.exports = __toCommonJS(serverEntry_exports);

// lib/tracking-fulfillment/config.ts
var TRACKING_FULFILLMENT_VERSION = "349.1.0";

// lib/supplier-engine/network/config.ts
function envFlag(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw === void 0 || raw === "") return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}
function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
var SUPPLIER_NETWORK_CONFIG = {
  get networkEnabled() {
    return envFlag("SUPPLIER_NETWORK_ENABLED", false);
  },
  get orderNetworkEnabled() {
    return envFlag("SUPPLIER_ORDER_NETWORK_ENABLED", false);
  },
  defaultEnvironment: "MOCK",
  defaultTimeoutMs: envInt("SUPPLIER_HTTP_TIMEOUT_MS", 3e4),
  maxResponseBytes: envInt("SUPPLIER_MAX_RESPONSE_BYTES", 5 * 1024 * 1024),
  maxRetries: envInt("SUPPLIER_HTTP_MAX_RETRIES", 3),
  maxConcurrentRequests: envInt("SUPPLIER_MAX_CONCURRENT_REQUESTS", 5)
};

// lib/supplier-engine/network/scopedValidationNetwork.ts
var import_async_hooks = require("async_hooks");
var scopedContext = new import_async_hooks.AsyncLocalStorage();

// lib/tracking-fulfillment/safety.ts
var counters = { realHttpCalls: 0, fabricatedTrackingIds: 0, webhookProcessed: 0 };
function getTrackingSafetyCounters() {
  return { ...counters };
}
function assertTrackingSafetyInvariants() {
  const violations = [];
  if (counters.realHttpCalls !== 0) violations.push(`realHttpCalls=${counters.realHttpCalls}`);
  if (counters.fabricatedTrackingIds !== 0) violations.push(`fabricatedTrackingIds=${counters.fabricatedTrackingIds}`);
  return { ok: violations.length === 0, violations };
}

// lib/tracking-fulfillment/admin.ts
function getTrackingFulfillmentDashboard() {
  const safety = assertTrackingSafetyInvariants();
  return {
    version: TRACKING_FULFILLMENT_VERSION,
    liveStatus: "UNVERIFIED",
    productionEnabled: "DISABLED",
    safetyCounters: getTrackingSafetyCounters(),
    blockers: safety.ok ? [] : safety.violations
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertTrackingSafetyInvariants,
  getTrackingFulfillmentDashboard,
  getTrackingSafetyCounters
});
