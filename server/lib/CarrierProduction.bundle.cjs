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

// lib/production-access/evidenceStore.ts
var evidenceStore = /* @__PURE__ */ new Map();
var evidenceByProvider = /* @__PURE__ */ new Map();
function listProviderAccessEvidence(provider) {
  const ids = evidenceByProvider.get(provider) || [];
  return ids.map((id) => evidenceStore.get(id)).filter(Boolean);
}
function hasProductionEvidence(provider, capability) {
  return listProviderAccessEvidence(provider).some(
    (e) => e.capability === capability && (e.environment === "PRODUCTION" || e.environment === "CONTROLLED_VALIDATION") && e.responseStatus >= 200 && e.responseStatus < 300
  );
}

// lib/production-access/providerLiveStatus.ts
function deriveProviderLiveStatus(input) {
  if (!input.secret.secretRefConfigured && !input.secret.secretResolvable) {
    return "NOT_CONFIGURED";
  }
  const validated = input.evidenceCapabilities.some(
    (cap) => hasProductionEvidence(input.secret.providerId, cap)
  );
  if (validated) return "VALIDATED";
  if (input.secret.secretResolvable || input.secret.secretRefConfigured) return "UNVERIFIED";
  return "NOT_CONFIGURED";
}

// lib/supplier-engine/credentials.ts
function resolveCredentials(secretsRef) {
  if (!secretsRef) return null;
  const envKey = secretsRef.startsWith("env:") ? secretsRef.slice(4) : secretsRef;
  const raw = process.env[envKey];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return { token: raw };
  }
}

// lib/supplier-order-readiness/config.ts
var READINESS_TTL_MS = 24 * 60 * 60 * 1e3;
var APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
var DEFAULT_POLICY = {
  maxStockAgeMs: Number(process.env.SUPPLIER_READINESS_MAX_STOCK_AGE_MS || 6 * 60 * 60 * 1e3),
  maxPriceAgeMs: Number(process.env.SUPPLIER_READINESS_MAX_PRICE_AGE_MS || 6 * 60 * 60 * 1e3),
  maxProductAgeMs: Number(process.env.SUPPLIER_READINESS_MAX_PRODUCT_AGE_MS || 24 * 60 * 60 * 1e3),
  maxOrderValue: Number(process.env.SUPPLIER_READINESS_MAX_ORDER_VALUE || 5e3),
  maxDailyOrderValue: Number(process.env.SUPPLIER_READINESS_MAX_DAILY_ORDER_VALUE || 25e3),
  maxSingleSupplierOrderValue: Number(process.env.SUPPLIER_READINESS_MAX_SINGLE_ORDER_VALUE || 2500),
  blockOnWarningIncidents: process.env.SUPPLIER_READINESS_BLOCK_ON_WARNING_INCIDENTS === "1",
  blockOnMissingReturnCapability: process.env.SUPPLIER_READINESS_BLOCK_MISSING_RETURN !== "0",
  blockOnMissingTrackingCapability: false,
  requiredOrderCapabilities: ["createOrder", "orderStatus", "trackingAPI"]
};

// lib/production-access/secretRefs.ts
function normalizeSecretRef(raw, fallbackEnvKey) {
  const value = raw?.trim();
  if (!value) return `env:${fallbackEnvKey}`;
  if (value.startsWith("env:")) return value;
  return `env:${value}`;
}
function secretRefConfigured(envKey) {
  return Boolean(process.env[envKey]?.trim());
}
function resolveGenericSecretRef(input) {
  const raw = process.env[input.secretRefEnvKey]?.trim();
  const secretsRef = normalizeSecretRef(raw, input.fallbackEnvKey || input.secretRefEnvKey.replace(/_SECRET_REF$/, ""));
  const envKey = secretsRef.startsWith("env:") ? secretsRef.slice(4) : secretsRef;
  return {
    providerId: input.providerId,
    secretRefKey: secretsRef,
    secretRefConfigured: secretRefConfigured(envKey) || Boolean(raw),
    secretResolvable: Boolean(resolveCredentials(secretsRef)),
    credentialStatus: resolveCredentials(secretsRef) ? "CONFIGURED" : "NOT_CONFIGURED"
  };
}

// lib/carrier-production/admin.ts
function getCarrierProductionDashboard() {
  const safety = assertCarrierProductionSafetyInvariants();
  const secret = resolveGenericSecretRef({
    providerId: "carrier",
    secretRefEnvKey: "CARRIER_PROVIDER_SECRET_REF"
  });
  return {
    version: CARRIER_PRODUCTION_VERSION,
    productionEnabled: isCarrierProductionEnabled() ? "ENABLED" : "DISABLED",
    liveStatus: deriveProviderLiveStatus({ secret, evidenceCapabilities: ["health"] }),
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
