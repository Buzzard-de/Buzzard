import {
  getReturnRequest,
  getReturnsByCustomer,
  getShipmentsForReturn,
  getCustomerRefundForReturn,
  getAuthorization,
} from "./registry";
import { canCustomerAccessReturn } from "./security";
import type { CustomerReturnView, ReturnRequest } from "./types";

export function toCustomerReturnView(ret: ReturnRequest): CustomerReturnView {
  const refund = getCustomerRefundForReturn(ret.returnId);
  const shipment = getShipmentsForReturn(ret.returnId)[0];
  const auth = getAuthorization(ret.returnId);

  return {
    returnId: ret.returnId,
    returnNumber: ret.returnNumber,
    orderId: ret.orderId,
    status: ret.status,
    reason: ret.reason,
    items: ret.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    refundStatus: refund?.status,
    refundAmount: refund?.refundedAmount,
    currency: ret.currency,
    trackingNumber: shipment?.trackingNumber,
    instructions: auth?.instructions,
    requestedAt: ret.requestedAt,
  };
}

export function getCustomerReturn(returnId: string, customerId: string): CustomerReturnView | null {
  const ret = getReturnRequest(returnId);
  if (!ret || !canCustomerAccessReturn(ret.customerId, customerId)) return null;
  return toCustomerReturnView(ret);
}

export function listCustomerReturns(customerId: string): CustomerReturnView[] {
  return getReturnsByCustomer(customerId).map(toCustomerReturnView);
}

/** Returned units must not automatically become saleable inventory. */
export function evaluateReturnInventoryOutcome(): string {
  return "RESTOCK requires explicit future workflow — foundation does not auto-restock";
}

