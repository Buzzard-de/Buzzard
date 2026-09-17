export type TrackingSource = "SANDBOX" | "LIVE" | "UNKNOWN";

export type ShipmentState =
  | "PENDING"
  | "LABEL_CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_DELIVERY"
  | "LOST"
  | "UNKNOWN"
  | "STALE";

export interface TrackingEventRecord {
  eventId: string;
  trackingNumber: string;
  supplierId: string;
  supplierOrderId: string;
  carrier?: string;
  state: ShipmentState;
  source: TrackingSource;
  rawStatus?: string;
  customerSafeStatus: string;
  dedupeKey: string;
  receivedAt: string;
}

export interface TrackingFulfillmentDashboard {
  version: string;
  liveStatus: "BLOCKED" | "NOT_CONFIGURED" | "UNVERIFIED";
  productionEnabled: "DISABLED";
  safetyCounters: { realHttpCalls: number; fabricatedTrackingIds: number };
  blockers: string[];
}
