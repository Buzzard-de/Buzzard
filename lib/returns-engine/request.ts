import { getOrder, saveOrder } from "@/lib/order-engine";
import { assertOrderTransition } from "@/lib/order-engine/status";
import {
  generateReturnId,
  generateReturnNumber,
  getReturnByIdempotencyKey,
  getReturnRequest,
  saveReturnRequest,
} from "./registry";
import { evaluateReturnEligibility } from "./eligibility";
import { emitReturnEvent } from "./events";
import { recordReturnAudit } from "./audit";
import type { CreateReturnInput, CreateReturnResult, ReturnItem, ReturnRequest } from "./types";

export function createReturnRequest(input: CreateReturnInput): CreateReturnResult {
  const existing = getReturnByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return { ok: true, returnRequest: existing, idempotentReplay: true };
  }

  const eligibility = evaluateReturnEligibility(input);
  if (eligibility.outcome === "ineligible") {
    return {
      ok: false,
      errorCode: "INELIGIBLE",
      errorMessage: eligibility.reasonCode,
      eligibility,
    };
  }

  const order = getOrder(input.orderId)!;
  const now = new Date().toISOString();
  const returnId = generateReturnId();

  const items: ReturnItem[] = input.items.map((item) => {
    const orderItem = order.items.find((oi) => oi.orderItemId === item.orderItemId)!;
    return {
      returnItemId: `ri_${returnId}_${item.orderItemId}`,
      orderItemId: item.orderItemId,
      productId: orderItem.productId,
      supplierId: orderItem.supplierId,
      supplierOfferId: orderItem.supplierOfferId,
      quantity: item.quantity,
      reason: item.reason ?? input.reason,
      condition: item.condition ?? "UNKNOWN",
      expectedRefundAmount: orderItem.lineGross,
      approvedRefundAmount: 0,
      supplierRecoveryAmount: 0,
      restockingAmount: 0,
      damageAmount: 0,
      finalBuzzardImpact: 0,
    };
  });

  const initialStatus = eligibility.outcome === "reviewRequired" ? "UNDER_REVIEW" : "REQUESTED";

  const returnRequest: ReturnRequest = {
    returnId,
    returnNumber: generateReturnNumber(),
    orderId: order.orderId,
    customerId: order.customerId,
    marketId: order.marketId,
    channel: order.channel,
    currency: order.currency,
    status: initialStatus,
    reason: input.reason,
    items,
    requestedAt: now,
    returnWindowDeadline: eligibility.returnWindowDeadline,
    returnShippingCost: 0,
    customerRefundAmount: 0,
    supplierRefundAmount: 0,
    supplierCreditAmount: 0,
    marketplaceRefundAmount: 0,
    buzzardLoss: 0,
    buzzardRecovery: 0,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };

  saveReturnRequest(returnRequest);

  if (canSyncOrderReturnStatus(order.status)) {
    const nextOrderStatus = order.status === "DELIVERED" || order.status === "SHIPPED"
      ? "RETURN_REQUESTED"
      : order.status;
    if (nextOrderStatus !== order.status) {
      assertOrderTransition(order.status, nextOrderStatus);
    }
    saveOrder({
      ...order,
      status: nextOrderStatus,
      returnRefund: {
        ...order.returnRefund,
        returnStatus: "REQUESTED",
        refundStatus: "REQUESTED",
      },
      updatedAt: now,
    });
  }

  emitReturnEvent({
    returnId,
    type: "RETURN_REQUESTED",
    source: "returns-engine",
    metadata: { reason: input.reason },
  });
  recordReturnAudit({
    returnId,
    actor: "returns-engine",
    action: "RETURN_CREATED",
    newStatus: initialStatus,
  });

  return { ok: true, returnRequest, eligibility };
}

function canSyncOrderReturnStatus(status: string): boolean {
  return ["DELIVERED", "SHIPPED", "SUPPLIER_CONFIRMED"].includes(status);
}

export function approveReturn(returnId: string, actor = "admin"): ReturnRequest | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret || ret.status !== "REQUESTED" && ret.status !== "UNDER_REVIEW") return undefined;

  const updated: ReturnRequest = {
    ...ret,
    status: "APPROVED",
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveReturnRequest(updated);
  emitReturnEvent({ returnId, type: "RETURN_APPROVED", source: actor });
  recordReturnAudit({
    returnId,
    actor,
    action: "RETURN_APPROVED",
    oldStatus: ret.status,
    newStatus: "APPROVED",
  });
  return updated;
}

export function rejectReturn(returnId: string, actor = "admin"): ReturnRequest | undefined {
  const ret = getReturnRequest(returnId);
  if (!ret) return undefined;

  const updated: ReturnRequest = {
    ...ret,
    status: "REJECTED",
    updatedAt: new Date().toISOString(),
  };
  saveReturnRequest(updated);
  emitReturnEvent({ returnId, type: "RETURN_REJECTED", source: actor });
  recordReturnAudit({
    returnId,
    actor,
    action: "RETURN_REJECTED",
    oldStatus: ret.status,
    newStatus: "REJECTED",
  });
  return updated;
}
