import { isSupplierOrderNetworkEnabled } from "@/lib/supplier-engine/network";
import type { CreateOrderValidationSafetyCounters } from "./types";

const counters: CreateOrderValidationSafetyCounters = {
  controlledValidationHttpCalls: 0,
  realSupplierOrderCalls: 0,
  realSupplierCancelCalls: 0,
  realSupplierReturnCalls: 0,
  realSupplierRefundCalls: 0,
  realPaymentCalls: 0,
  realMarketplaceCalls: 0,
  realCarrierCalls: 0,
  realCustomerOrders: 0,
  realCustomerShipments: 0,
};

export function getCreateOrderValidationSafetyCounters(): CreateOrderValidationSafetyCounters {
  return { ...counters };
}

export function resetCreateOrderValidationSafetyCountersForTests(): void {
  for (const key of Object.keys(counters) as Array<keyof CreateOrderValidationSafetyCounters>) {
    counters[key] = 0;
  }
}

export function assertCreateOrderValidationNetworkSafety(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderCalls++;
    throw new Error("CREATE_ORDER_VALIDATION_FAIL:SUPPLIER_ORDER_NETWORK_MUST_BE_DISABLED");
  }
}

export function recordBlockedProductionOrderAttempt(): void {
  /* Hard block — no counter increment for real calls */
}

export function recordControlledValidationHttpCall(): void {
  counters.controlledValidationHttpCalls++;
}

export function recordRealSupplierOrderCallIfNetworkEnabled(): void {
  if (isSupplierOrderNetworkEnabled()) {
    counters.realSupplierOrderCalls++;
  }
}

export function assertCreateOrderValidationSafetyInvariants(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (counters.realSupplierOrderCalls !== 0) {
    violations.push(`realSupplierOrderCalls=${counters.realSupplierOrderCalls}`);
  }
  /* controlledValidationHttpCalls may be >0 in mock controlled runs — not a production order violation */
  if (counters.realCustomerOrders !== 0) violations.push(`realCustomerOrders=${counters.realCustomerOrders}`);
  if (counters.realPaymentCalls !== 0) violations.push(`realPaymentCalls=${counters.realPaymentCalls}`);
  if (counters.realCarrierCalls !== 0) violations.push(`realCarrierCalls=${counters.realCarrierCalls}`);
  if (counters.realCustomerShipments !== 0) {
    violations.push(`realCustomerShipments=${counters.realCustomerShipments}`);
  }
  if (isSupplierOrderNetworkEnabled()) violations.push("SUPPLIER_ORDER_NETWORK_ENABLED");
  return { ok: violations.length === 0, violations };
}
