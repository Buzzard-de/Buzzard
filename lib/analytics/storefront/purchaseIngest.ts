import { getOrder } from "@/lib/order-engine";
import { collectAnalyticsEvent, ingestAuthoritativeOrderPurchase } from "../eventCollector";
import type { CollectEventResult } from "../types";

export function ingestStorefrontPurchaseSignal(orderId: string, correlationId?: string): CollectEventResult {
  const trimmed = orderId.trim();
  if (!trimmed) return { ok: false, errorCode: "MISSING_ORDER_ID" };

  const orderEngineOrder = getOrder(trimmed);
  if (orderEngineOrder) {
    return ingestAuthoritativeOrderPurchase(trimmed, correlationId ?? trimmed);
  }

  return collectAnalyticsEvent({
    eventType: "CHECKOUT_COMPLETED",
    orderIdReference: trimmed,
    correlationId: correlationId ?? trimmed,
    metadata: { source: "STOREFRONT_CHECKOUT", awaitingOrderEngineSync: true },
  });
}
