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

// lib/production-kill-switch/index.ts
var index_exports = {};
__export(index_exports, {
  assertProductionActionAllowed: () => assertProductionActionAllowed,
  getProductionKillSwitch: () => getProductionKillSwitch,
  getProductionKillSwitchDashboard: () => getProductionKillSwitchDashboard,
  isProductionKillSwitchActive: () => isProductionKillSwitchActive,
  resetGlobalKillSwitchForTests: () => resetGlobalKillSwitchForTests,
  setDomainKillSwitch: () => setDomainKillSwitch,
  setProductionGlobalKillSwitch: () => setProductionGlobalKillSwitch
});
module.exports = __toCommonJS(index_exports);
var import_crypto2 = require("crypto");

// lib/supplier-order-readiness/persistence.ts
var killSwitchState = null;
function getKillSwitchState() {
  return killSwitchState;
}

// lib/supplier-order-readiness/killSwitch.ts
function defaultState() {
  return {
    global: process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH === "1",
    suppliers: {},
    markets: {},
    channels: {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getKillSwitch() {
  return getKillSwitchState() || defaultState();
}
function isGlobalKillSwitchActive() {
  return getKillSwitch().global || process.env.SUPPLIER_ORDER_GLOBAL_KILL_SWITCH === "1";
}

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

// lib/production-access/audit.ts
var import_crypto = require("crypto");
var auditLog = [];
function getPersistentStore() {
  if (typeof process === "undefined" || process.env.BUZZARD_PRODUCTION_ACCESS_PERSISTENCE === "0") {
    return null;
  }
  try {
    const mod = require("../../server/lib/production-access/persistentStore.js");
    return mod.createProductionAccessStore();
  } catch {
    return null;
  }
}
function recordProductionAccessAudit(input) {
  const event = {
    eventId: (0, import_crypto.randomUUID)(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...input
  };
  auditLog.push(event);
  getPersistentStore()?.saveAudit({
    event_id: event.eventId,
    type: event.type,
    actor: event.actor,
    correlation_id: event.correlationId,
    provider: event.provider || null,
    scope: event.scope || null,
    approval: event.approval || null,
    payload_hash: event.payloadHash || null,
    result: event.result || null,
    detail_json: event.detail ? JSON.stringify(event.detail) : null,
    timestamp: event.timestamp
  });
  return event;
}

// lib/production-kill-switch/persistence.ts
var inMemory = null;
function getPersistentStore2() {
  if (typeof process === "undefined" || process.env.BUZZARD_PRODUCTION_KILL_SWITCH_PERSISTENCE === "0") {
    return null;
  }
  try {
    const mod = require("../../server/lib/production-kill-switch/persistentStore.js");
    return mod.createProductionKillSwitchStore();
  } catch {
    return null;
  }
}
function saveGlobalKillSwitchState(state) {
  inMemory = state;
  getPersistentStore2()?.saveState({
    global: state.global ? 1 : 0,
    domains_json: JSON.stringify(state.domains),
    updated_at: state.updatedAt,
    updated_by: state.updatedBy || null,
    correlation_id: state.correlationId || null,
    reason: state.reason || null
  });
}
function getGlobalKillSwitchState() {
  if (inMemory) return inMemory;
  const row = getPersistentStore2()?.getState();
  if (!row) return null;
  return {
    global: Boolean(row.global),
    domains: JSON.parse(String(row.domains_json || "{}")),
    updatedAt: String(row.updated_at),
    updatedBy: row.updated_by ? String(row.updated_by) : void 0,
    correlationId: row.correlation_id ? String(row.correlation_id) : void 0,
    reason: row.reason ? String(row.reason) : void 0
  };
}
function resetGlobalKillSwitchForTests() {
  inMemory = null;
}

// lib/production-kill-switch/index.ts
var DEFAULT_DOMAINS = {
  SUPPLIER_ORDERS: false,
  PAYMENTS: false,
  CARRIER: false,
  REFUNDS: false,
  MARKETING_SPEND: false,
  SALES: false
};
function defaultState2() {
  return {
    global: process.env.PRODUCTION_GLOBAL_KILL_SWITCH === "1" || isGlobalKillSwitchActive(),
    domains: { ...DEFAULT_DOMAINS },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function getProductionKillSwitch() {
  return getGlobalKillSwitchState() || defaultState2();
}
function isProductionKillSwitchActive(domain) {
  const state = getProductionKillSwitch();
  if (state.global || isGlobalKillSwitchActive()) return true;
  if (domain && state.domains[domain]) return true;
  return false;
}
function assertProductionActionAllowed(domain, context) {
  if (isProductionKillSwitchActive(domain)) {
    throw new Error(`${context}:PRODUCTION_KILL_SWITCH_ACTIVE:${domain}`);
  }
}
function setProductionGlobalKillSwitch(input) {
  const current = getProductionKillSwitch();
  const next = {
    global: input.enabled,
    domains: { ...current.domains, ...input.domains },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy: input.actor,
    correlationId: input.correlationId || (0, import_crypto2.randomUUID)(),
    reason: input.reason
  };
  saveGlobalKillSwitchState(next);
  recordProductionAccessAudit({
    type: "GLOBAL_KILL_SWITCH_CHANGED",
    actor: input.actor,
    correlationId: next.correlationId,
    result: input.enabled ? "ENABLED" : "DISABLED",
    detail: { domains: next.domains, reason: input.reason }
  });
  return next;
}
function setDomainKillSwitch(input) {
  const current = getProductionKillSwitch();
  const next = {
    ...current,
    domains: { ...current.domains, [input.domain]: input.enabled },
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy: input.actor,
    correlationId: input.correlationId || (0, import_crypto2.randomUUID)()
  };
  saveGlobalKillSwitchState(next);
  recordProductionAccessAudit({
    type: "DOMAIN_KILL_SWITCH_CHANGED",
    actor: input.actor,
    correlationId: next.correlationId,
    scope: input.domain,
    result: input.enabled ? "ENABLED" : "DISABLED"
  });
  return next;
}
function getProductionKillSwitchDashboard() {
  const state = getProductionKillSwitch();
  return {
    global: state.global || isGlobalKillSwitchActive(),
    domains: state.domains,
    salesEnabled: isProductionFlagEnabled("SALES"),
    supplierNetworkEnabled: isProductionFlagEnabled("SUPPLIER_ORDER_NETWORK"),
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  assertProductionActionAllowed,
  getProductionKillSwitch,
  getProductionKillSwitchDashboard,
  isProductionKillSwitchActive,
  resetGlobalKillSwitchForTests,
  setDomainKillSwitch,
  setProductionGlobalKillSwitch
});
