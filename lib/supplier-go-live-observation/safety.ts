import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";

const counters = {
  realSupplierHttpCalls: 0,
  realSupplierOrders: 0,
  realCustomerOrders: 0,
  marketplaceSideEffects: 0,
  paymentSideEffects: 0,
  carrierSideEffects: 0,
  customerNotifications: 0,
};

export function getObservationSafetyCounters() {
  return { ...counters };
}

export function resetObservationSafetyCountersForTests(): void {
  for (const key of Object.keys(counters) as Array<keyof typeof counters>) {
    counters[key] = 0;
  }
}

export function assertObservationNetworkSafety(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierHttpCalls++;
    throw new Error("OBSERVATION_FAIL:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }
}

export function assertObservationSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realSupplierHttpCalls !== 0) violations.push(`realSupplierHttpCalls=${counters.realSupplierHttpCalls}`);
  if (counters.realSupplierOrders !== 0) violations.push(`realSupplierOrders=${counters.realSupplierOrders}`);
  if (counters.realCustomerOrders !== 0) violations.push(`realCustomerOrders=${counters.realCustomerOrders}`);
  if (counters.marketplaceSideEffects !== 0) violations.push(`marketplaceSideEffects=${counters.marketplaceSideEffects}`);
  if (counters.paymentSideEffects !== 0) violations.push(`paymentSideEffects=${counters.paymentSideEffects}`);
  if (counters.carrierSideEffects !== 0) violations.push(`carrierSideEffects=${counters.carrierSideEffects}`);
  if (counters.customerNotifications !== 0) violations.push(`customerNotifications=${counters.customerNotifications}`);
  if (isSupplierOrderNetworkEnabled()) violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  return { ok: violations.length === 0, violations };
}
