import { getOrder, saveOrder } from "./registry";
import { rollbackReservations } from "./reservation";
import { cancelPreparedSupplierOrders } from "./fulfillment";
import { isCancellableStatus, assertOrderTransition } from "./status";
import { emitOrderEvent } from "./events";
import { recordStatusTransition } from "./audit";
import type { BuzzardOrder, CreateOrderResult } from "./types";

export function cancelOrder(
  orderId: string,
  options?: { customerId?: string; actor?: string }
): CreateOrderResult {
  const order = getOrder(orderId);
  if (!order) {
    return { ok: false, errorCode: "ORDER_CREATION_FAILED", errorMessage: "ORDER_NOT_FOUND" };
  }

  if (options?.customerId && order.customerId !== options.customerId) {
    return { ok: false, errorCode: "UNAUTHORIZED", errorMessage: "UNAUTHORIZED" };
  }

  if (!isCancellableStatus(order.status)) {
    return {
      ok: false,
      errorCode: "VALIDATION_FAILED",
      errorMessage: `CANNOT_CANCEL_STATUS:${order.status}`,
    };
  }

  rollbackReservations(order.reservationIds);
  const cancelledSupplierOrders = cancelPreparedSupplierOrders(order);

  assertOrderTransition(order.status, "CANCELLED");
  const updated: BuzzardOrder = {
    ...order,
    status: "CANCELLED",
    fulfillmentStatus: "CANCELLED",
    supplierOrders: cancelledSupplierOrders,
    reservationIds: [],
    updatedAt: new Date().toISOString(),
  };

  saveOrder(updated);
  emitOrderEvent({
    orderId,
    type: "ORDER_CANCELLED",
    source: options?.actor ?? "order-engine",
  });
  emitOrderEvent({
    orderId,
    type: "RESERVATION_RELEASED",
    source: "order-engine",
    metadata: { reason: "CANCELLATION" },
  });
  recordStatusTransition(orderId, options?.actor ?? "order-engine", order.status, "CANCELLED");

  return { ok: true, order: updated };
}
