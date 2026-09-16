import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import type { RehearsalSafetyCounters } from "./types";

const counters: RehearsalSafetyCounters = {
  realSupplierOrderHttpCalls: 0,
  realCustomerShipments: 0,
  realPaymentCaptures: 0,
  realMarketplaceSubmissions: 0,
  realCarrierCalls: 0,
  realSupplierReturns: 0,
  realSupplierRefunds: 0,
};

export function getRehearsalSafetyCounters(): RehearsalSafetyCounters {
  return { ...counters };
}

export function resetRehearsalSafetyCountersForTests(): void {
  counters.realSupplierOrderHttpCalls = 0;
  counters.realCustomerShipments = 0;
  counters.realPaymentCaptures = 0;
  counters.realMarketplaceSubmissions = 0;
  counters.realCarrierCalls = 0;
  counters.realSupplierReturns = 0;
  counters.realSupplierRefunds = 0;
}

export function assertRehearsalNetworkSafety(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderHttpCalls++;
    throw new Error("REHEARSAL_FAIL:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }
}

export function recordBlockedRealActivationAttempt(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderHttpCalls++;
  }
}

export function assertRehearsalSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realSupplierOrderHttpCalls !== 0) {
    violations.push(`realSupplierOrderHttpCalls=${counters.realSupplierOrderHttpCalls}`);
  }
  if (counters.realCustomerShipments !== 0) {
    violations.push(`realCustomerShipments=${counters.realCustomerShipments}`);
  }
  if (counters.realPaymentCaptures !== 0) {
    violations.push(`realPaymentCaptures=${counters.realPaymentCaptures}`);
  }
  if (counters.realMarketplaceSubmissions !== 0) {
    violations.push(`realMarketplaceSubmissions=${counters.realMarketplaceSubmissions}`);
  }
  if (counters.realCarrierCalls !== 0) {
    violations.push(`realCarrierCalls=${counters.realCarrierCalls}`);
  }
  if (counters.realSupplierReturns !== 0) {
    violations.push(`realSupplierReturns=${counters.realSupplierReturns}`);
  }
  if (counters.realSupplierRefunds !== 0) {
    violations.push(`realSupplierRefunds=${counters.realSupplierRefunds}`);
  }
  if (isSupplierOrderNetworkEnabled()) {
    violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  }
  return { ok: violations.length === 0, violations };
}
