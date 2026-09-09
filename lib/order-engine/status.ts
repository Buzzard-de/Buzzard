import type { OrderStatus, PaymentStatus, SupplierOrderStatus } from "./types";

const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED", "FAILED"],
  PENDING_PAYMENT: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["CONFIRMED", "FAILED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "FAILED"],
  PROCESSING: ["SUPPLIER_PENDING", "FAILED", "CANCELLED"],
  SUPPLIER_PENDING: ["SUPPLIER_CONFIRMED", "FAILED", "CANCELLED"],
  SUPPLIER_CONFIRMED: ["SHIPPED", "FAILED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURN_REQUESTED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURNED", "REFUNDED", "PARTIALLY_REFUNDED"],
  RETURNED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  FAILED: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrderStatus(from, to)) {
    throw new Error(`INVALID_ORDER_TRANSITION:${from}->${to}`);
  }
}

export function isCancellableStatus(status: OrderStatus): boolean {
  return ["DRAFT", "PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING", "SUPPLIER_PENDING"].includes(status);
}

export function mapPaymentToOrderStatus(paymentStatus: PaymentStatus): OrderStatus | null {
  switch (paymentStatus) {
    case "AUTHORIZED":
    case "CAPTURED":
      return "PAID";
    case "FAILED":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return null;
  }
}

export function activeSupplierOrderStatuses(): SupplierOrderStatus[] {
  return ["NOT_CREATED", "PREPARED"];
}
