import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";

const counters = {
  realSupplierOrderCalls: 0,
  realCustomerOrders: 0,
  marketplaceCalls: 0,
  paymentCalls: 0,
  carrierCalls: 0,
  customerNotifications: 0,
};

export function getArmingSafetyCounters() {
  return { ...counters };
}

export function resetArmingSafetyCountersForTests(): void {
  for (const key of Object.keys(counters) as Array<keyof typeof counters>) {
    counters[key] = 0;
  }
}

export function assertArmingNetworkSafety(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderCalls++;
    throw new Error("ARMING_FAIL:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }
}

export function assertArmingSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realSupplierOrderCalls !== 0) violations.push(`realSupplierOrderCalls=${counters.realSupplierOrderCalls}`);
  if (counters.realCustomerOrders !== 0) violations.push(`realCustomerOrders=${counters.realCustomerOrders}`);
  if (isSupplierOrderNetworkEnabled()) violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  return { ok: violations.length === 0, violations };
}

export function recordBlockedProductionExecutionAttempt(): void {
  /* Hard block — no real HTTP */
}
