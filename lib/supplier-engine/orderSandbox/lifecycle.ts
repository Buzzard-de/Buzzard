import type { SupplierOrderSandboxStatus } from "./types";

const TRANSITIONS: Record<SupplierOrderSandboxStatus, SupplierOrderSandboxStatus[]> = {
  PREPARED: ["VALIDATED", "FAILED", "CANCELLED"],
  VALIDATED: ["SANDBOX_ACCEPTED", "FAILED", "CANCELLED"],
  SANDBOX_ACCEPTED: ["SUPPLIER_PENDING", "FAILED", "CANCELLED"],
  SUPPLIER_PENDING: ["SUPPLIER_CONFIRMED", "PROCESSING", "FAILED", "CANCELLED"],
  SUPPLIER_CONFIRMED: ["PROCESSING", "SHIPPED", "FAILED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "FAILED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionSupplierOrderStatus(
  from: SupplierOrderSandboxStatus,
  to: SupplierOrderSandboxStatus
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertSupplierOrderTransition(
  from: SupplierOrderSandboxStatus,
  to: SupplierOrderSandboxStatus
): void {
  if (!canTransitionSupplierOrderStatus(from, to)) {
    throw new Error(`INVALID_SUPPLIER_ORDER_TRANSITION:${from}->${to}`);
  }
}

export function advanceSandboxSimulation(
  current: SupplierOrderSandboxStatus
): SupplierOrderSandboxStatus {
  switch (current) {
    case "SANDBOX_ACCEPTED":
      return "SUPPLIER_PENDING";
    case "SUPPLIER_PENDING":
      return "SUPPLIER_CONFIRMED";
    case "SUPPLIER_CONFIRMED":
      return "PROCESSING";
    case "PROCESSING":
      return "SHIPPED";
    case "SHIPPED":
      return "DELIVERED";
    default:
      return current;
  }
}
