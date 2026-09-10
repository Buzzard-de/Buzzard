import type { ReturnStatus } from "./types";

const VALID_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["LABEL_PENDING", "IN_TRANSIT", "CANCELLED"],
  REJECTED: ["CLOSED"],
  LABEL_PENDING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["RECEIVED", "CANCELLED"],
  RECEIVED: ["INSPECTION_PENDING"],
  INSPECTION_PENDING: ["INSPECTED"],
  INSPECTED: ["SUPPLIER_PENDING", "REFUND_PENDING"],
  SUPPLIER_PENDING: ["SUPPLIER_ACCEPTED", "SUPPLIER_REJECTED"],
  SUPPLIER_ACCEPTED: ["REFUND_PENDING", "REPLACEMENT_PENDING"],
  SUPPLIER_REJECTED: ["REFUND_PENDING", "CLOSED"],
  REFUND_PENDING: ["REFUNDED", "PARTIALLY_REFUNDED"],
  REFUNDED: ["CLOSED"],
  PARTIALLY_REFUNDED: ["REFUNDED", "CLOSED"],
  REPLACEMENT_PENDING: ["REPLACED", "CLOSED"],
  REPLACED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionReturnStatus(from: ReturnStatus, to: ReturnStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertReturnTransition(from: ReturnStatus, to: ReturnStatus): void {
  if (!canTransitionReturnStatus(from, to)) {
    throw new Error(`INVALID_RETURN_TRANSITION:${from}->${to}`);
  }
}

export function transitionReturnStatus(
  current: ReturnStatus,
  next: ReturnStatus
): ReturnStatus {
  assertReturnTransition(current, next);
  return next;
}
