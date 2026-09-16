import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import type { ActivationSafetyCounters } from "./types";

const counters: ActivationSafetyCounters = {
  realSupplierOrderCalls: 0,
  realSupplierCancelCalls: 0,
  realSupplierReturnCalls: 0,
  realSupplierRefundCalls: 0,
  realPaymentCalls: 0,
  realMarketplaceCalls: 0,
  realCarrierCalls: 0,
  realCustomerShipments: 0,
};

export function getActivationSafetyCounters(): ActivationSafetyCounters {
  return { ...counters };
}

export function resetActivationSafetyCountersForTests(): void {
  for (const key of Object.keys(counters) as Array<keyof ActivationSafetyCounters>) {
    counters[key] = 0;
  }
}

export function assertActivationNetworkSafety(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderCalls++;
    throw new Error("ACTIVATION_FAIL:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED_IN_340");
  }
}

export function recordBlockedRealOrderAttempt(): void {
  /* Pre-network hard block — no counter increment for real calls */
}

export function recordRealOrderAttemptIfNetworkEnabled(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderCalls++;
  }
}

export function assertActivationSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realSupplierOrderCalls !== 0) violations.push(`realSupplierOrderCalls=${counters.realSupplierOrderCalls}`);
  if (counters.realSupplierCancelCalls !== 0) violations.push(`realSupplierCancelCalls=${counters.realSupplierCancelCalls}`);
  if (counters.realSupplierReturnCalls !== 0) violations.push(`realSupplierReturnCalls=${counters.realSupplierReturnCalls}`);
  if (counters.realSupplierRefundCalls !== 0) violations.push(`realSupplierRefundCalls=${counters.realSupplierRefundCalls}`);
  if (counters.realPaymentCalls !== 0) violations.push(`realPaymentCalls=${counters.realPaymentCalls}`);
  if (counters.realMarketplaceCalls !== 0) violations.push(`realMarketplaceCalls=${counters.realMarketplaceCalls}`);
  if (counters.realCarrierCalls !== 0) violations.push(`realCarrierCalls=${counters.realCarrierCalls}`);
  if (counters.realCustomerShipments !== 0) violations.push(`realCustomerShipments=${counters.realCustomerShipments}`);
  if (isSupplierOrderNetworkEnabled()) violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  return { ok: violations.length === 0, violations };
}
