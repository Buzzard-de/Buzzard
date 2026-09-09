import type { ReturnRefundFoundation } from "./types";

/** Default return/refund foundation — extension point for future Returns Engine. */
export function createReturnRefundFoundation(): ReturnRefundFoundation {
  return {
    returnStatus: "NONE",
    refundStatus: "NONE",
    refundAmount: 0,
    supplierRefundAmount: 0,
    supplierCreditAmount: 0,
    returnShippingCost: 0,
    buzzardRefundLoss: 0,
  };
}

/**
 * Financial chain visibility (NOT implemented — foundation only):
 * Customer Refund → Supplier Credit/Refund → Return Shipping → Marketplace Refund → Buzzard Loss
 */
export function documentRefundChain(): string {
  return [
    "Customer Refund",
    "Supplier Credit / Supplier Refund",
    "Return Shipping",
    "Marketplace Refund",
    "Buzzard Final Loss / Profit",
  ].join(" → ");
}

export function initReturnRequest(foundation: ReturnRefundFoundation): ReturnRefundFoundation {
  return {
    ...foundation,
    returnStatus: "REQUESTED",
    refundStatus: "REQUESTED",
  };
}
