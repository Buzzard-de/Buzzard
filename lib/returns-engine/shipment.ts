import {
  getReturnRequest,
  saveReturnRequest,
  saveReturnShipment,
  getShipmentsForReturn,
} from "./registry";
import { emitReturnEvent } from "./events";
import type { ReturnShipment, ReturnShippingPayer } from "./types";

export function createReturnShipment(input: {
  returnId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  cost: number;
  currency: string;
  payer: ReturnShippingPayer;
}): ReturnShipment | undefined {
  const ret = getReturnRequest(input.returnId);
  if (!ret) return undefined;

  const now = new Date().toISOString();
  const shipment: ReturnShipment = {
    returnShipmentId: `rsh_${input.returnId}_${Date.now()}`,
    returnId: input.returnId,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
    cost: input.cost,
    currency: input.currency,
    payer: input.payer,
    status: "IN_TRANSIT",
    createdAt: now,
    updatedAt: now,
  };
  saveReturnShipment(shipment);

  const updated = {
    ...ret,
    returnShippingCost: ret.returnShippingCost + input.cost,
    status: "IN_TRANSIT" as const,
    updatedAt: now,
  };
  saveReturnRequest(updated);

  emitReturnEvent({
    returnId: input.returnId,
    type: "RETURN_SHIPPED",
    source: "returns-engine",
    metadata: { trackingNumber: input.trackingNumber, payer: input.payer },
  });

  return shipment;
}

export function getReturnShippingFinancials(returnId: string): {
  customerPaidReturnShipping: number;
  buzzardReturnShippingCost: number;
  supplierReturnShippingRecovery: number;
  marketplaceReturnShippingRecovery: number;
} {
  const shipments = getShipmentsForReturn(returnId);
  let customerPaid = 0;
  let buzzardCost = 0;
  let supplierRecovery = 0;
  let marketplaceRecovery = 0;

  for (const s of shipments) {
    switch (s.payer) {
      case "CUSTOMER":
        customerPaid += s.cost;
        break;
      case "BUZZARD":
        buzzardCost += s.cost;
        break;
      case "SUPPLIER":
        supplierRecovery += s.cost;
        break;
      case "MARKETPLACE":
        marketplaceRecovery += s.cost;
        break;
      default:
        buzzardCost += s.cost;
    }
  }

  return {
    customerPaidReturnShipping: customerPaid,
    buzzardReturnShippingCost: buzzardCost,
    supplierReturnShippingRecovery: supplierRecovery,
    marketplaceReturnShippingRecovery: marketplaceRecovery,
  };
}
