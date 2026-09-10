import { getOrder, saveOrder } from "@/lib/order-engine";
import { assertOrderTransition } from "@/lib/order-engine/status";
import {
  getReturnRequest,
  saveCustomerRefund,
  getCustomerRefundForReturn,
  saveReturnRequest,
} from "./registry";
import { emitReturnEvent } from "./events";
import { recordReturnAudit } from "./audit";
import type { CustomerRefund, CustomerRefundStatus } from "./types";

/** Dry-run customer refund — no real payment processing. */

export function requestCustomerRefund(returnId: string): CustomerRefund | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret) return undefined;

  const existing = getCustomerRefundForReturn(returnId);
  if (existing) return existing;

  const requestedAmount = ret.items.reduce((s, i) => s + i.expectedRefundAmount, 0);
  const now = new Date().toISOString();

  const refund: CustomerRefund = {
    refundId: `crf_${returnId}_${Date.now()}`,
    orderId: ret.orderId,
    returnId,
    customerId: ret.customerId,
    requestedAmount,
    approvedAmount: 0,
    refundedAmount: 0,
    currency: ret.currency,
    status: "REQUESTED",
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
  saveCustomerRefund(refund);

  emitReturnEvent({ returnId, type: "CUSTOMER_REFUND_REQUESTED", source: "returns-engine" });
  return refund;
}

export function processCustomerRefund(input: {
  returnId: string;
  approvedAmount: number;
  simulateFailure?: boolean;
}): CustomerRefund | undefined {
  const ret = getReturnRequest(input.returnId);
  const refund = getCustomerRefundForReturn(input.returnId);
  if (!ret || !refund) return undefined;

  const now = new Date().toISOString();

  if (input.simulateFailure) {
    const failed: CustomerRefund = {
      ...refund,
      status: "FAILED",
      updatedAt: now,
    };
    saveCustomerRefund(failed);
    return failed;
  }

  const isPartial = input.approvedAmount < refund.requestedAmount;
  const status: CustomerRefundStatus = isPartial ? "PARTIALLY_COMPLETED" : "COMPLETED";

  const updated: CustomerRefund = {
    ...refund,
    approvedAmount: input.approvedAmount,
    refundedAmount: input.approvedAmount,
    status,
    updatedAt: now,
  };
  saveCustomerRefund(updated);

  saveReturnRequest({
    ...ret,
    customerRefundAmount: input.approvedAmount,
    status: isPartial ? "PARTIALLY_REFUNDED" : "REFUNDED",
    updatedAt: now,
  });

  const order = getOrder(ret.orderId);
  if (order) {
    const orderStatus = isPartial ? "PARTIALLY_REFUNDED" : "REFUNDED";
    if (canTransitionToRefund(order.status)) {
      assertOrderTransition(order.status, orderStatus);
    }
    saveOrder({
      ...order,
      status: canTransitionToRefund(order.status) ? orderStatus : order.status,
      returnRefund: {
        ...order.returnRefund,
        refundStatus: isPartial ? "PARTIAL" : "COMPLETED",
        refundAmount: input.approvedAmount,
        buzzardRefundLoss: Math.max(0, input.approvedAmount - ret.buzzardRecovery),
      },
      updatedAt: now,
    });
  }

  emitReturnEvent({
    returnId: input.returnId,
    type: "CUSTOMER_REFUND_COMPLETED",
    source: "returns-engine",
    metadata: { amount: input.approvedAmount, partial: isPartial },
  });
  recordReturnAudit({
    returnId: input.returnId,
    actor: "returns-engine",
    action: "CUSTOMER_REFUND_COMPLETED",
    amount: input.approvedAmount,
    currency: ret.currency,
    oldStatus: ret.status,
    newStatus: isPartial ? "PARTIALLY_REFUNDED" : "REFUNDED",
  });

  return updated;
}

function canTransitionToRefund(status: string): boolean {
  return ["RETURN_REQUESTED", "RETURNED", "DELIVERED", "PARTIALLY_REFUNDED"].includes(status);
}
