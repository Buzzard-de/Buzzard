import { getOrder } from "@/lib/order-engine";
import type { BuzzardOrder } from "@/lib/order-engine/types";
import { getCustomerRefundForReturn } from "@/lib/returns-engine/registry";
import type { AnalyticsEvent, RevenueMetrics } from "./types";
import { listEvents } from "./registry";

const REVENUE_ELIGIBLE_ORDER_STATUSES = new Set<BuzzardOrder["status"]>([
  "PAID",
  "CONFIRMED",
  "PROCESSING",
  "SUPPLIER_PENDING",
  "SUPPLIER_CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

function isRevenueEligibleOrder(order: BuzzardOrder): boolean {
  if (order.paymentStatus === "CAPTURED" || order.paymentStatus === "AUTHORIZED") return true;
  return REVENUE_ELIGIBLE_ORDER_STATUSES.has(order.status);
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function resolveAuthoritativeOrderRevenue(orderId: string): {
  ok: boolean;
  grossCents?: number;
  currency?: string;
  errorCode?: string;
} {
  const order = getOrder(orderId);
  if (!order) return { ok: false, errorCode: "ORDER_NOT_FOUND" };
  if (!isRevenueEligibleOrder(order)) {
    return { ok: false, errorCode: "ORDER_NOT_ELIGIBLE" };
  }
  return { ok: true, grossCents: toCents(order.totalGross), currency: order.currency };
}

export function resolveAuthoritativeRefundAmount(returnId: string): {
  ok: boolean;
  refundCents?: number;
  errorCode?: string;
} {
  const refund = getCustomerRefundForReturn(returnId);
  if (!refund) return { ok: false, errorCode: "REFUND_NOT_FOUND" };
  return { ok: true, refundCents: toCents(refund.refundedAmount) };
}

export function computeRevenueMetrics(events: AnalyticsEvent[] = listEvents()): RevenueMetrics {
  let grossRevenueCents = 0;
  let refundAmountCents = 0;
  let orderCount = 0;
  const seenOrders = new Set<string>();

  for (const event of events) {
    if (event.eventType === "PURCHASE" && event.revenueAuthority === "AUTHORITATIVE") {
      const key = event.orderIdReference ?? event.eventId;
      if (seenOrders.has(key)) continue;
      seenOrders.add(key);
      grossRevenueCents += toCents(event.value ?? 0);
      orderCount += 1;
    }
    if (event.eventType === "REFUND" && event.revenueAuthority === "AUTHORITATIVE") {
      refundAmountCents += toCents(event.value ?? 0);
    }
  }

  const netRevenueCents = grossRevenueCents - refundAmountCents;
  return {
    grossRevenueCents,
    refundAmountCents,
    netRevenueCents,
    orderCount,
    averageOrderValueCents: orderCount ? Math.round(grossRevenueCents / orderCount) : 0,
    authoritativeOnly: true,
  };
}

export function validateClientRevenueClaim(input: {
  eventType: string;
  value?: number;
  authoritative?: boolean;
  orderIdReference?: string;
  returnId?: string;
}): "AUTHORITATIVE" | "PROVISIONAL" | "REJECTED" {
  if (input.eventType !== "PURCHASE" && input.eventType !== "REFUND") return "PROVISIONAL";
  if (input.authoritative === true && !input.orderIdReference && !input.returnId) return "REJECTED";
  if (input.value !== undefined && input.value > 0 && !input.orderIdReference && !input.returnId) {
    return "REJECTED";
  }
  if (input.eventType === "REFUND" && input.returnId) {
    const resolved = resolveAuthoritativeRefundAmount(input.returnId);
    if (resolved.ok) return "AUTHORITATIVE";
    return "PROVISIONAL";
  }
  if (input.orderIdReference) {
    const resolved = resolveAuthoritativeOrderRevenue(input.orderIdReference);
    if (resolved.ok) return "AUTHORITATIVE";
    return "PROVISIONAL";
  }
  return "PROVISIONAL";
}
