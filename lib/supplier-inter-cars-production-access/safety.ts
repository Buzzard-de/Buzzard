const counters = {
  realHttpCalls: 0,
  realCreateOrderCalls: 0,
  realSupplierOrders: 0,
  realCustomerOrders: 0,
};

export function getProductionAccessSafetyCounters() {
  return { ...counters };
}

export function resetProductionAccessSafetyCountersForTests(): void {
  counters.realHttpCalls = 0;
  counters.realCreateOrderCalls = 0;
  counters.realSupplierOrders = 0;
  counters.realCustomerOrders = 0;
}

export function assertProductionAccessSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realHttpCalls !== 0) violations.push(`realHttpCalls=${counters.realHttpCalls}`);
  if (counters.realCreateOrderCalls !== 0) violations.push(`realCreateOrderCalls=${counters.realCreateOrderCalls}`);
  if (counters.realSupplierOrders !== 0) violations.push(`realSupplierOrders=${counters.realSupplierOrders}`);
  if (counters.realCustomerOrders !== 0) violations.push(`realCustomerOrders=${counters.realCustomerOrders}`);
  return { ok: violations.length === 0, violations };
}
