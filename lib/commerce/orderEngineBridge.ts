import { createOrder } from "@/lib/order-engine";
import { getOrder } from "@/lib/order-engine";
import type { AddressSnapshot, CreateOrderInput, OrderChannel } from "@/lib/order-engine/types";
import { ingestAuthoritativeOrderPurchase } from "@/lib/analytics/eventCollector";
import { collectAnalyticsEvent } from "@/lib/analytics/eventCollector";
import type { CollectEventResult } from "@/lib/analytics/types";
import {
  getCommerceOrderMapping,
  getCommerceMappingByEngineOrderId,
  saveCommerceOrderMapping,
  type CommerceOrderEngineMapping,
} from "./orderEngineRegistry";
import { validateOrderIdForAuthoritativePurchase } from "./purchaseValidation";

export interface CommerceOrderSyncInput {
  commerceOrderId: string;
  checkoutId: string;
  customerId?: string | null;
  customerEmail?: string;
  marketId: string;
  channel?: OrderChannel;
  language?: string;
  currency: string;
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: AddressSnapshot;
  idempotencyKey: string;
}

export interface CommerceOrderSyncResult {
  ok: boolean;
  orderEngineOrderId?: string;
  idempotentReplay?: boolean;
  analytics?: CollectEventResult;
  errorCode?: string;
  errorMessage?: string;
}

export function mapCommerceAddressToSnapshot(address: Record<string, unknown>): AddressSnapshot {
  const line1 = String(address.line1 ?? address.street ?? "");
  const recipientName = [address.firstName, address.lastName].filter(Boolean).join(" ").trim();
  return {
    recipientName: recipientName || "Commerce Customer",
    street: line1,
    houseNumber: address.houseNumber ? String(address.houseNumber) : undefined,
    postalCode: String(address.postalCode ?? ""),
    city: String(address.city ?? ""),
    country: String(address.country ?? "DE").toUpperCase(),
  };
}

export function resolveOrderEngineOrderId(orderIdOrCommerceId: string): string | undefined {
  const direct = getOrder(orderIdOrCommerceId);
  if (direct) return direct.orderId;

  const mapped = getCommerceOrderMapping(orderIdOrCommerceId);
  return mapped?.orderEngineOrderId;
}

export function validatePurchaseSignalAccess(
  orderIdOrCommerceId: string,
  customerIdContext?: string
): { ok: boolean; orderEngineOrderId?: string; errorCode?: string } {
  const orderEngineOrderId = resolveOrderEngineOrderId(orderIdOrCommerceId);
  if (!orderEngineOrderId) {
    return { ok: false, errorCode: "ORDER_NOT_FOUND" };
  }

  const mapping =
    getCommerceOrderMapping(orderIdOrCommerceId)
    ?? getCommerceMappingByEngineOrderId(orderIdOrCommerceId);
  if (customerIdContext && mapping?.customerId && mapping.customerId !== customerIdContext) {
    return { ok: false, errorCode: "CROSS_CUSTOMER_ACCESS" };
  }

  const order = getOrder(orderEngineOrderId);
  if (customerIdContext && order?.customerId && order.customerId !== customerIdContext) {
    return { ok: false, errorCode: "CROSS_CUSTOMER_ACCESS" };
  }

  return { ok: true, orderEngineOrderId };
}

export async function syncCommerceOrderToEngine(input: CommerceOrderSyncInput): Promise<CommerceOrderSyncResult> {
  const existing = getCommerceOrderMapping(input.commerceOrderId);
  if (existing) {
    const analytics = ingestAuthoritativePurchaseForOrder(existing.orderEngineOrderId, input.commerceOrderId);
    return {
      ok: true,
      orderEngineOrderId: existing.orderEngineOrderId,
      idempotentReplay: true,
      analytics,
    };
  }

  if (!input.items.length) {
    return { ok: false, errorCode: "ORDER_HAS_NO_LINES" };
  }

  const createInput: CreateOrderInput = {
    customerId: input.customerId || `commerce_guest_${input.commerceOrderId}`,
    customerEmail:
      input.customerEmail
      || `${input.customerId || input.commerceOrderId}@commerce.buzzard.local`,
    marketId: input.marketId.toUpperCase(),
    channel: input.channel || "direct",
    items: input.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    shippingAddress: input.shippingAddress,
    idempotencyKey: `commerce:${input.commerceOrderId}:${input.idempotencyKey}`,
  };

  const created = await createOrder(createInput);
  if (!created.ok || !created.order) {
    return {
      ok: false,
      errorCode: created.errorCode ?? "ORDER_ENGINE_SYNC_FAILED",
      errorMessage: created.errorMessage,
    };
  }

  const mapping: CommerceOrderEngineMapping = {
    commerceOrderId: input.commerceOrderId,
    orderEngineOrderId: created.order.orderId,
    customerId: input.customerId ?? undefined,
    marketId: input.marketId.toUpperCase(),
    currency: input.currency,
    syncedAt: new Date().toISOString(),
  };
  saveCommerceOrderMapping(mapping);

  collectAnalyticsEvent({
    eventType: "CHECKOUT_COMPLETED",
    orderIdReference: input.commerceOrderId,
    correlationId: input.commerceOrderId,
    market: mapping.marketId,
    country: mapping.marketId,
    language: input.language ?? "de",
    currency: input.currency,
    metadata: { source: "STOREFRONT_CHECKOUT", orderEngineOrderId: created.order.orderId },
  });

  const analytics = ingestAuthoritativePurchaseForOrder(created.order.orderId, input.commerceOrderId);

  return {
    ok: true,
    orderEngineOrderId: created.order.orderId,
    analytics,
  };
}

export function ingestAuthoritativePurchaseForOrder(
  orderEngineOrderId: string,
  correlationCommerceOrderId?: string
): CollectEventResult {
  const validation = validateOrderIdForAuthoritativePurchase(orderEngineOrderId);
  if (!validation.ok || !validation.order) {
    return { ok: false, errorCode: validation.errorCode ?? "ORDER_NOT_ELIGIBLE" };
  }

  const correlationId = correlationCommerceOrderId
    ? `commerce:${correlationCommerceOrderId}`
    : orderEngineOrderId;

  return ingestAuthoritativeOrderPurchase(orderEngineOrderId, correlationId);
}

export function ingestStorefrontPurchaseSignalResolved(
  orderIdOrCommerceId: string,
  correlationId?: string,
  customerIdContext?: string
): CollectEventResult {
  const access = validatePurchaseSignalAccess(orderIdOrCommerceId, customerIdContext);
  if (!access.ok || !access.orderEngineOrderId) {
    return { ok: false, errorCode: access.errorCode ?? "ORDER_NOT_FOUND" };
  }

  return ingestAuthoritativePurchaseForOrder(
    access.orderEngineOrderId,
    orderIdOrCommerceId.startsWith("ord_") ? orderIdOrCommerceId : correlationId ?? orderIdOrCommerceId
  );
}
