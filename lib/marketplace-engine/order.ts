import { createOrder } from "@/lib/order-engine";
import {
  generateOrderMappingId,
  getOrderMappingByMarketplaceOrder,
  saveOrderMapping,
} from "./registry";
import { getMarketplaceConnector } from "./connector";
import { emitMarketplaceEvent } from "./events";
import { recordMarketplaceAudit } from "./audit";
import type { ImportMarketplaceOrderInput, ImportMarketplaceOrderResult, MarketplaceOrderStatusMapping } from "./types";

const STATUS_MAP: MarketplaceOrderStatusMapping[] = [
  { marketplaceStatus: "PAID", buzzardStatus: "PAID" },
  { marketplaceStatus: "PENDING", buzzardStatus: "PENDING_PAYMENT" },
  { marketplaceStatus: "SHIPPED", buzzardStatus: "SHIPPED" },
  { marketplaceStatus: "DELIVERED", buzzardStatus: "DELIVERED" },
  { marketplaceStatus: "CANCELLED", buzzardStatus: "CANCELLED" },
  { marketplaceStatus: "RETURN_REQUESTED", buzzardStatus: "RETURN_REQUESTED" },
];

export function mapMarketplaceOrderStatus(marketplaceStatus: string): string {
  const mapped = STATUS_MAP.find(
    (m) => m.marketplaceStatus.toUpperCase() === marketplaceStatus.toUpperCase()
  );
  return mapped?.buzzardStatus ?? "PENDING_PAYMENT";
}

export async function importMarketplaceOrder(
  input: ImportMarketplaceOrderInput
): Promise<ImportMarketplaceOrderResult> {
  const existing = getOrderMappingByMarketplaceOrder(input.marketplaceId, input.marketplaceOrderId);
  if (existing) {
    return {
      ok: true,
      orderId: existing.orderId,
      mapping: existing,
      idempotentReplay: true,
    };
  }

  const orderResult = await createOrder({
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    marketId: input.marketId,
    channel: input.channel,
    items: input.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    shippingAddress: input.shippingAddress,
    idempotencyKey: input.idempotencyKey,
  });

  if (!orderResult.ok || !orderResult.order) {
    return {
      ok: false,
      errorCode: "ORDER_IMPORT_FAILED",
      errorMessage: orderResult.errorMessage ?? orderResult.errorCode,
    };
  }

  const now = new Date().toISOString();
  const mapping = {
    mappingId: generateOrderMappingId(),
    marketplaceId: input.marketplaceId,
    marketplaceOrderId: input.marketplaceOrderId,
    orderId: orderResult.order.orderId,
    status: mapMarketplaceOrderStatus(input.marketplaceStatus),
    importedAt: now,
    updatedAt: now,
  };
  saveOrderMapping(mapping);

  const connector = getMarketplaceConnector(input.marketplaceId);
  await connector.acknowledgeOrder(input.marketplaceOrderId);

  emitMarketplaceEvent({
    marketplaceId: input.marketplaceId,
    type: "ORDER_IMPORTED",
    source: "marketplace-engine",
    metadata: {
      marketplaceOrderId: input.marketplaceOrderId,
      orderId: orderResult.order.orderId,
    },
  });
  recordMarketplaceAudit({
    marketplaceId: input.marketplaceId,
    actor: "marketplace-engine",
    action: "ORDER_IMPORTED",
    relatedOrderId: orderResult.order.orderId,
  });

  return { ok: true, orderId: orderResult.order.orderId, mapping };
}

export async function fetchMarketplaceOrders(
  marketplaceId: string,
  since?: string
): Promise<{ ok: boolean; orders: unknown[] }> {
  const connector = getMarketplaceConnector(marketplaceId);
  const result = await connector.fetchOrders(since);
  return { ok: result.ok, orders: result.data?.orders ?? [] };
}
