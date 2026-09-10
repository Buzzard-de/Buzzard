import { getMarketplaceConnector } from "./connector";
import { getOrderMappingByMarketplaceOrder, saveShipment } from "./registry";
import { emitMarketplaceEvent } from "./events";
import type { MarketplaceShipment } from "./types";

export async function createMarketplaceShipment(input: {
  marketplaceId: string;
  orderId: string;
  marketplaceOrderId?: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}): Promise<{ ok: boolean; shipment?: MarketplaceShipment; errorMessage?: string }> {
  const connector = getMarketplaceConnector(input.marketplaceId);
  const mpOrderId =
    input.marketplaceOrderId ??
    getOrderMappingByMarketplaceOrder(input.marketplaceId, input.orderId)?.marketplaceOrderId;

  if (!mpOrderId) {
    return { ok: false, errorMessage: "MARKETPLACE_ORDER_NOT_FOUND" };
  }

  const result = await connector.createShipment({
    marketplaceOrderId: mpOrderId,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
  });

  if (!result.ok || !result.data) {
    return { ok: false, errorMessage: result.errorMessage ?? "SHIPMENT_FAILED" };
  }

  const now = new Date().toISOString();
  const shipment: MarketplaceShipment = {
    shipmentId: result.data.shipmentId,
    marketplaceId: input.marketplaceId,
    orderId: input.orderId,
    marketplaceOrderId: mpOrderId,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
    status: "PREPARED",
    shippedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  saveShipment(shipment);

  emitMarketplaceEvent({
    marketplaceId: input.marketplaceId,
    type: "SHIPMENT_CREATED",
    source: "marketplace-engine",
    metadata: { shipmentId: shipment.shipmentId, orderId: input.orderId },
  });

  return { ok: true, shipment };
}

export async function updateMarketplaceTracking(input: {
  marketplaceId: string;
  shipmentId: string;
  trackingNumber: string;
  trackingUrl?: string;
}): Promise<{ ok: boolean }> {
  const connector = getMarketplaceConnector(input.marketplaceId);
  const result = await connector.updateTracking(
    input.shipmentId,
    input.trackingNumber,
    input.trackingUrl
  );

  if (result.ok) {
    emitMarketplaceEvent({
      marketplaceId: input.marketplaceId,
      type: "TRACKING_UPDATED",
      source: "marketplace-engine",
      metadata: { shipmentId: input.shipmentId },
    });
  }

  return { ok: result.ok };
}
