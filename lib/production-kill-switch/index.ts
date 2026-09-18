import { randomUUID } from "crypto";
import { isGlobalKillSwitchActive as isSupplierGlobalKillSwitchActive } from "@/lib/supplier-order-readiness/killSwitch";
import { isProductionFlagEnabled } from "@/lib/production-defaults";
import { recordProductionAccessAudit } from "@/lib/production-access/audit";
import { getGlobalKillSwitchState, saveGlobalKillSwitchState } from "./persistence";
import type { GlobalProductionKillSwitchState, KillSwitchDomain } from "./types";

const DEFAULT_DOMAINS: Record<KillSwitchDomain, boolean> = {
  SUPPLIER_ORDERS: false,
  PAYMENTS: false,
  CARRIER: false,
  REFUNDS: false,
  MARKETING_SPEND: false,
  SALES: false,
};

function defaultState(): GlobalProductionKillSwitchState {
  return {
    global: process.env.PRODUCTION_GLOBAL_KILL_SWITCH === "1" || isSupplierGlobalKillSwitchActive(),
    domains: { ...DEFAULT_DOMAINS },
    updatedAt: new Date().toISOString(),
  };
}

export function getProductionKillSwitch(): GlobalProductionKillSwitchState {
  return getGlobalKillSwitchState() || defaultState();
}

export function isProductionKillSwitchActive(domain?: KillSwitchDomain): boolean {
  const state = getProductionKillSwitch();
  if (state.global || isSupplierGlobalKillSwitchActive()) return true;
  if (domain && state.domains[domain]) return true;
  return false;
}

export function assertProductionActionAllowed(domain: KillSwitchDomain, context: string): void {
  if (isProductionKillSwitchActive(domain)) {
    throw new Error(`${context}:PRODUCTION_KILL_SWITCH_ACTIVE:${domain}`);
  }
}

export function setProductionGlobalKillSwitch(input: {
  enabled: boolean;
  actor: string;
  reason?: string;
  correlationId?: string;
  domains?: Partial<Record<KillSwitchDomain, boolean>>;
}): GlobalProductionKillSwitchState {
  const current = getProductionKillSwitch();
  const next: GlobalProductionKillSwitchState = {
    global: input.enabled,
    domains: { ...current.domains, ...input.domains },
    updatedAt: new Date().toISOString(),
    updatedBy: input.actor,
    correlationId: input.correlationId || randomUUID(),
    reason: input.reason,
  };
  saveGlobalKillSwitchState(next);
  recordProductionAccessAudit({
    type: "GLOBAL_KILL_SWITCH_CHANGED",
    actor: input.actor,
    correlationId: next.correlationId!,
    result: input.enabled ? "ENABLED" : "DISABLED",
    detail: { domains: next.domains, reason: input.reason },
  });
  return next;
}

export function setDomainKillSwitch(input: {
  domain: KillSwitchDomain;
  enabled: boolean;
  actor: string;
  correlationId?: string;
}): GlobalProductionKillSwitchState {
  const current = getProductionKillSwitch();
  const next: GlobalProductionKillSwitchState = {
    ...current,
    domains: { ...current.domains, [input.domain]: input.enabled },
    updatedAt: new Date().toISOString(),
    updatedBy: input.actor,
    correlationId: input.correlationId || randomUUID(),
  };
  saveGlobalKillSwitchState(next);
  recordProductionAccessAudit({
    type: "DOMAIN_KILL_SWITCH_CHANGED",
    actor: input.actor,
    correlationId: next.correlationId!,
    scope: input.domain,
    result: input.enabled ? "ENABLED" : "DISABLED",
  });
  return next;
}

export function getProductionKillSwitchDashboard(): {
  global: boolean;
  domains: Record<KillSwitchDomain, boolean>;
  salesEnabled: boolean;
  supplierNetworkEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
} {
  const state = getProductionKillSwitch();
  return {
    global: state.global || isSupplierGlobalKillSwitchActive(),
    domains: state.domains,
    salesEnabled: isProductionFlagEnabled("SALES"),
    supplierNetworkEnabled: isProductionFlagEnabled("SUPPLIER_ORDER_NETWORK"),
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
  };
}

export { resetGlobalKillSwitchForTests } from "./persistence";
