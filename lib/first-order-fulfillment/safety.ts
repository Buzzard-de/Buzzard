import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import { assertProductionFlagDisabled, enforceCiProductionSafety } from "@/lib/production-defaults";

const counters = {
  realSupplierHttpCalls: 0,
  realSupplierOrders: 0,
  realCustomerOrders: 0,
  paymentSideEffects: 0,
  carrierSideEffects: 0,
  unknownOutcomes: 0,
  mockExecutions: 0,
};

export function getFulfillmentSafetyCounters() {
  return { ...counters };
}

export function resetFulfillmentSafetyCountersForTests(): void {
  for (const key of Object.keys(counters) as Array<keyof typeof counters>) {
    counters[key] = 0;
  }
}

export function assertFulfillmentNetworkSafety(): void {
  enforceCiProductionSafety("FULFILLMENT_348");
  assertProductionFlagDisabled("SUPPLIER_ORDER_NETWORK", "FULFILLMENT_348");
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierHttpCalls++;
    throw new Error("FULFILLMENT_348:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }
}

export function assertFulfillmentSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realSupplierHttpCalls !== 0) violations.push(`realSupplierHttpCalls=${counters.realSupplierHttpCalls}`);
  if (counters.realSupplierOrders !== 0) violations.push(`realSupplierOrders=${counters.realSupplierOrders}`);
  if (counters.realCustomerOrders !== 0) violations.push(`realCustomerOrders=${counters.realCustomerOrders}`);
  if (counters.paymentSideEffects !== 0) violations.push(`paymentSideEffects=${counters.paymentSideEffects}`);
  if (counters.carrierSideEffects !== 0) violations.push(`carrierSideEffects=${counters.carrierSideEffects}`);
  if (isSupplierOrderNetworkEnabled()) violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  return { ok: violations.length === 0, violations };
}

export function recordMockFulfillmentExecution(): void {
  counters.mockExecutions++;
}

export function recordUnknownFulfillmentOutcome(): void {
  counters.unknownOutcomes++;
}
