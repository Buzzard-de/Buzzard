import { classifyTrackingSource } from "@/lib/tracking-fulfillment/adapter";
import type { TradeRouteFulfillmentSnapshot } from "./types";

export interface OrderTrackingSnapshot {
  carrier?: string;
  trackingNumber?: string;
  shipmentId?: string;
  status: "NOT_ATTACHED" | "ATTACHED" | "BLOCKED";
  events: Array<{ state: string; timestamp: string }>;
  estimatedDelivery?: string;
  trackingSupported: boolean;
}

/**
 * Attach tracking metadata only when a real identifier exists.
 * Never marks tracking as present without a tracking number.
 */
export function attachTrackingToOrder(input: {
  orderId: string;
  carrierId?: string;
  trackingNumber?: string;
  shipmentId?: string;
  fulfillmentSnapshot?: TradeRouteFulfillmentSnapshot;
}): OrderTrackingSnapshot {
  const trackingNumber = String(input.trackingNumber ?? "").trim();
  if (!trackingNumber) {
    return {
      status: "NOT_ATTACHED",
      events: [],
      trackingSupported: input.fulfillmentSnapshot?.trackingSupported ?? false,
      estimatedDelivery: input.fulfillmentSnapshot?.estimatedDelivery,
    };
  }

  const source = classifyTrackingSource(trackingNumber);
  if (source === "UNKNOWN") {
    return {
      carrier: input.carrierId,
      trackingNumber,
      shipmentId: input.shipmentId,
      status: "BLOCKED",
      events: [],
      trackingSupported: false,
      estimatedDelivery: input.fulfillmentSnapshot?.estimatedDelivery,
    };
  }

  return {
    carrier: input.carrierId,
    trackingNumber,
    shipmentId: input.shipmentId,
    status: "ATTACHED",
    events: [{ state: "LABEL_CREATED", timestamp: new Date().toISOString() }],
    trackingSupported: true,
    estimatedDelivery: input.fulfillmentSnapshot?.estimatedDelivery,
  };
}
