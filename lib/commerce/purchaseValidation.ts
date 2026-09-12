import { getOrder } from "@/lib/order-engine";
import type { BuzzardOrder } from "@/lib/order-engine/types";

const PURCHASE_ELIGIBLE_STATUSES = new Set<BuzzardOrder["status"]>([
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "SUPPLIER_PENDING",
  "SUPPLIER_CONFIRMED",
  "SHIPPED",
  "DELIVERED",
]);

const BLOCKED_STATUSES = new Set<BuzzardOrder["status"]>([
  "CANCELLED",
  "FAILED",
  "DRAFT",
  "PENDING_PAYMENT",
]);

export function validateOrderForAuthoritativePurchase(order: BuzzardOrder): {
  ok: boolean;
  errorCode?: string;
} {
  if (!order.orderId) return { ok: false, errorCode: "INVALID_ORDER_ID" };
  if (BLOCKED_STATUSES.has(order.status)) return { ok: false, errorCode: "ORDER_NOT_ELIGIBLE" };
  if (!order.items?.length) return { ok: false, errorCode: "ORDER_HAS_NO_LINES" };
  if (!order.currency) return { ok: false, errorCode: "INVALID_CURRENCY" };
  if (!order.marketId) return { ok: false, errorCode: "INVALID_MARKET" };
  if (!(order.totalGross > 0)) return { ok: false, errorCode: "MISSING_FINANCIAL_SNAPSHOT" };

  const paid =
    order.paymentStatus === "CAPTURED"
    || order.paymentStatus === "AUTHORIZED"
    || PURCHASE_ELIGIBLE_STATUSES.has(order.status);

  if (!paid) return { ok: false, errorCode: "ORDER_NOT_PURCHASE_ELIGIBLE" };

  for (const item of order.items) {
    if (!item.productId || item.quantity < 1) {
      return { ok: false, errorCode: "INVALID_ORDER_LINE" };
    }
  }

  return { ok: true };
}

export function validateOrderIdForAuthoritativePurchase(orderId: string): {
  ok: boolean;
  order?: BuzzardOrder;
  errorCode?: string;
} {
  const order = getOrder(orderId);
  if (!order) return { ok: false, errorCode: "ORDER_NOT_FOUND" };
  const validation = validateOrderForAuthoritativePurchase(order);
  if (!validation.ok) return { ok: false, errorCode: validation.errorCode };
  return { ok: true, order };
}
