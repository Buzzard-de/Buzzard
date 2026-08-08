export type ShipmentStatus =
  | "pending"
  | "preparing"
  | "handed_to_carrier"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "returned";

export interface ShipmentLine {
  productId?: string;
  name?: string;
  sku?: string;
  qty: number;
}

export interface ShipmentEvent {
  status: string;
  at: string;
  message?: string;
}

export interface Shipment {
  id: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: ShipmentStatus;
  lines: ShipmentLine[];
  events?: ShipmentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface Fulfillment {
  id: string;
  orderNumber: string;
  supplierId: string;
  model: "warehouse" | "dropshipping";
  status: string;
  lines: ShipmentLine[];
  supplierOrderId: string | null;
  error: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierOrder {
  id: string;
  buzzardOrderNumber: string;
  supplierId: string;
  status: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  error: string | null;
  retryCount: number;
  createdAt: string;
}

export interface ReturnRequest {
  id: string;
  orderNumber: string;
  customerId: string;
  items: Array<{ productId?: string; sku?: string; qty: number }>;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
